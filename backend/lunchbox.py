"""Campus registry and device-scoped, immutable LunchBox event ingestion."""
import hashlib
import json
import os
import secrets
import warnings
from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from PIL import Image, UnidentifiedImageError
from psycopg.types.json import Jsonb
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, StrictInt, model_validator


class Input(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False, str_strip_whitespace=True)


class DeviceInput(Input):
    campus_id: UUID
    label: str = Field(min_length=1, max_length=100)
    is_test: bool = False


class DeploymentInput(Input):
    device_id: UUID
    area_id: UUID | None = None
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    coordinate_quality: Literal['GPS', 'Approximate']
    starts_at: AwareDatetime


class CloseDeployment(Input):
    ends_at: AwareDatetime


class SpeciesCount(Input):
    label: str = Field(min_length=1, max_length=100)
    count: StrictInt = Field(ge=0, le=1_000_000)
    confidence: float | None = Field(default=None, ge=0, le=1)


class Observation(Input):
    event_id: UUID
    deployment_id: UUID
    observed_at: AwareDatetime
    interval_start: AwareDatetime
    interval_end: AwareDatetime
    count_basis: Literal['frame_count', 'interval_new', 'trap_total']
    processing_status: Literal['ok', 'capture_failed', 'inference_failed']
    mosquito_count: StrictInt | None = Field(default=None, ge=0, le=1_000_000)
    species_counts: list[SpeciesCount] = Field(default_factory=list, max_length=100)
    model_name: str = Field(min_length=1, max_length=100)
    model_version: str = Field(min_length=1, max_length=100)
    evidence_sha256: str | None = Field(default=None, pattern=r'^[a-f0-9]{64}$')

    @model_validator(mode='after')
    def consistency(self):
        for key in ('observed_at', 'interval_start', 'interval_end'):
            setattr(self, key, getattr(self, key).astimezone(timezone.utc))
        if not self.interval_start <= self.observed_at <= self.interval_end:
            raise ValueError('Require interval_start <= observed_at <= interval_end')
        if self.interval_end > datetime.now(timezone.utc) + timedelta(minutes=5):
            raise ValueError('Observation interval is in the future')
        if self.processing_status == 'ok':
            if self.mosquito_count is None or sum(row.count for row in self.species_counts) != self.mosquito_count:
                raise ValueError('Species counts, including unknown, must sum to mosquito_count')
        elif self.mosquito_count is not None or self.species_counts:
            raise ValueError('Failed processing must not report a count or species results')
        labels = [row.label.casefold() for row in self.species_counts]
        if len(labels) != len(set(labels)):
            raise ValueError('Species labels must be unique')
        return self


def create_router(connect, authorize, root):
    router = APIRouter()
    operator = [Depends(authorize)]
    bearer = HTTPBearer(auto_error=False)

    def log(conn, action, record_id, actor='pilot-operator'):
        conn.execute('INSERT INTO audit_events(id,action,record_id,actor) VALUES(%s,%s,%s,%s)',
                     (uuid4(), action, record_id, actor))

    def device_auth(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]):
        if credentials is None:
            raise HTTPException(401, 'Device credential required')
        digest = hashlib.sha256(credentials.credentials.encode()).hexdigest()
        with connect() as conn:
            device = conn.execute('SELECT id,campus_id,is_test FROM lunchbox_devices '
                                  'WHERE token_hash=%s AND revoked_at IS NULL', (digest,)).fetchone()
        if device is None:
            raise HTTPException(401, 'Invalid or revoked device credential')
        return device

    @router.get('/campuses', dependencies=operator)
    def campuses():
        with connect() as conn:
            return conn.execute('SELECT id,code,name,created_at FROM campuses ORDER BY code').fetchall()

    @router.get('/campuses/{campus_id}', dependencies=operator)
    def campus(campus_id: UUID):
        with connect() as conn:
            result = conn.execute('SELECT id,code,name FROM campuses WHERE id=%s', (campus_id,)).fetchone()
            if result is None:
                raise HTTPException(404, 'Campus not found')
            result['surveys'] = conn.execute('SELECT id,name,capture_date,captured_at FROM surveys '
                                             'WHERE campus_id=%s AND NOT is_test ORDER BY capture_date', (campus_id,)).fetchall()
            result['areas'] = conn.execute('SELECT a.id,a.survey_id,a.code,a.name,a.bounds,a.source_crs, '
                                           "count(f.id) FILTER(WHERE f.kind='raw') AS raw_images, "
                                           "count(f.id) FILTER(WHERE f.kind='processed') AS processed_assets "
                                           'FROM survey_areas a JOIN surveys s ON s.id=a.survey_id '
                                           'LEFT JOIN survey_assets f ON f.area_id=a.id WHERE s.campus_id=%s '
                                           'GROUP BY a.id ORDER BY a.code', (campus_id,)).fetchall()
            result['ground_verification'] = 'not_recorded'
            return result

    @router.post('/lunchbox/devices', dependencies=operator, status_code=201)
    def register_device(payload: DeviceInput):
        device_id, token = uuid4(), secrets.token_urlsafe(48)
        with connect() as conn:
            if not conn.execute('SELECT 1 FROM campuses WHERE id=%s', (payload.campus_id,)).fetchone():
                raise HTTPException(404, 'Campus not found')
            conn.execute('INSERT INTO lunchbox_devices(id,campus_id,label,token_hash,is_test) VALUES(%s,%s,%s,%s,%s)',
                         (device_id,payload.campus_id,payload.label,hashlib.sha256(token.encode()).hexdigest(),payload.is_test))
            log(conn, 'lunchbox.device.registered', device_id)
        return {'id': device_id, 'token': token, 'is_test': payload.is_test,
                'message': 'Store this credential securely. It is only returned once.'}

    @router.get('/lunchbox/devices', dependencies=operator)
    def devices(campus_id: UUID, include_test: bool = False):
        with connect() as conn:
            return conn.execute('SELECT id,campus_id,label,is_test,revoked_at,created_at FROM lunchbox_devices '
                                'WHERE campus_id=%s AND (%s OR NOT is_test) ORDER BY created_at',
                                (campus_id,include_test)).fetchall()

    @router.post('/lunchbox/devices/{device_id}/revoke', dependencies=operator)
    def revoke(device_id: UUID):
        with connect() as conn:
            row = conn.execute('UPDATE lunchbox_devices SET revoked_at=COALESCE(revoked_at,now()) WHERE id=%s '
                               'RETURNING id,revoked_at', (device_id,)).fetchone()
            if row is None:
                raise HTTPException(404, 'Device not found')
            log(conn, 'lunchbox.device.revoked', device_id)
            return row

    @router.post('/lunchbox/deployments', dependencies=operator, status_code=201)
    def deploy(payload: DeploymentInput):
        with connect() as conn:
            conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', (str(payload.device_id),))
            device = conn.execute('SELECT campus_id,revoked_at FROM lunchbox_devices WHERE id=%s', (payload.device_id,)).fetchone()
            if device is None or device['revoked_at'] is not None:
                raise HTTPException(404, 'Active device not found')
            if payload.area_id is not None and not conn.execute('SELECT 1 FROM survey_areas a JOIN surveys s ON s.id=a.survey_id '
                                                               'WHERE a.id=%s AND s.campus_id=%s',
                                                               (payload.area_id,device['campus_id'])).fetchone():
                raise HTTPException(422, 'Area must belong to the device campus')
            if conn.execute('SELECT 1 FROM lunchbox_deployments WHERE device_id=%s AND (ends_at IS NULL OR ends_at>%s)',
                            (payload.device_id,payload.starts_at)).fetchone():
                raise HTTPException(409, 'Close the earlier deployment and avoid overlapping times')
            record_id = uuid4()
            conn.execute('INSERT INTO lunchbox_deployments(id,device_id,area_id,location,coordinate_quality,starts_at) '
                         'VALUES(%s,%s,%s,ST_SetSRID(ST_MakePoint(%s,%s),4326)::geography,%s,%s)',
                         (record_id,payload.device_id,payload.area_id,payload.longitude,payload.latitude,
                          payload.coordinate_quality,payload.starts_at))
            log(conn, 'lunchbox.deployment.created', record_id)
            return {'id': record_id, **payload.model_dump()}

    @router.get('/lunchbox/deployments', dependencies=operator)
    def deployments(campus_id: UUID, include_test: bool = False):
        with connect() as conn:
            return conn.execute('SELECT p.id,p.device_id,p.area_id,p.coordinate_quality,p.starts_at,p.ends_at, '
                                'ST_Y(p.location::geometry) AS latitude,ST_X(p.location::geometry) AS longitude '
                                'FROM lunchbox_deployments p JOIN lunchbox_devices d ON d.id=p.device_id '
                                'WHERE d.campus_id=%s AND (%s OR NOT d.is_test) ORDER BY p.starts_at DESC LIMIT 500',
                                (campus_id,include_test)).fetchall()

    @router.post('/lunchbox/deployments/{deployment_id}/close', dependencies=operator)
    def close_deployment(deployment_id: UUID, payload: CloseDeployment):
        with connect() as conn:
            row = conn.execute('SELECT device_id,starts_at FROM lunchbox_deployments WHERE id=%s', (deployment_id,)).fetchone()
            if row is None:
                raise HTTPException(404, 'Deployment not found')
            conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', (str(row['device_id']),))
            if payload.ends_at <= row['starts_at']:
                raise HTTPException(422, 'End must follow start')
            if conn.execute("SELECT 1 FROM lunchbox_observations WHERE deployment_id=%s AND (payload->>'interval_end')::timestamptz>%s",
                            (deployment_id,payload.ends_at)).fetchone():
                raise HTTPException(409, 'End precedes retained observations')
            result = conn.execute('UPDATE lunchbox_deployments SET ends_at=%s WHERE id=%s AND ends_at IS NULL RETURNING id,ends_at',
                                  (payload.ends_at,deployment_id)).fetchone()
            if result is None:
                raise HTTPException(409, 'Deployment is already closed')
            log(conn, 'lunchbox.deployment.closed', deployment_id)
            return result

    def acknowledgement(conn, row, duplicate):
        stored = conn.execute('SELECT 1 FROM lunchbox_observation_images WHERE observation_id=%s', (row['id'],)).fetchone()
        image_status = 'stored' if stored else ('pending' if row['payload'].get('evidence_sha256') else 'not_requested')
        return {'id': row['id'], 'event_id': row['event_id'], 'received_at': row['received_at'],
                'duplicate': duplicate, 'accepted': True, 'complete': image_status != 'pending',
                'image_status': image_status, 'review_status': 'unreviewed', 'is_test': row['is_test']}

    @router.post('/lunchbox/observations', status_code=201)
    def ingest(payload: Observation, response: Response, device=Depends(device_auth)):
        body = payload.model_dump(mode='json')
        digest = hashlib.sha256(json.dumps(body,sort_keys=True,separators=(',',':')).encode()).hexdigest()
        with connect() as conn:
            # Serialize deployment changes and event inserts for this device, including retries.
            conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', (str(device['id']),))
            if not conn.execute('SELECT 1 FROM lunchbox_devices WHERE id=%s AND revoked_at IS NULL', (device['id'],)).fetchone():
                raise HTTPException(401, 'Device revoked')
            previous = conn.execute('SELECT * FROM lunchbox_observations WHERE device_id=%s AND event_id=%s',
                                    (device['id'],payload.event_id)).fetchone()
            if previous:
                if previous['payload_sha256'] != digest:
                    raise HTTPException(409, 'Event ID already exists with a different payload')
                response.status_code = 200
                return acknowledgement(conn, previous, True)
            deployment = conn.execute('SELECT * FROM lunchbox_deployments WHERE id=%s AND device_id=%s',
                                      (payload.deployment_id,device['id'])).fetchone()
            if deployment is None:
                raise HTTPException(403, 'Deployment does not belong to this device')
            if payload.interval_start < deployment['starts_at'] or (deployment['ends_at'] and payload.interval_end > deployment['ends_at']):
                raise HTTPException(422, 'Observation interval falls outside this deployment')
            row = conn.execute('INSERT INTO lunchbox_observations(id,device_id,deployment_id,event_id,observed_at,payload,payload_sha256,is_test) '
                               'VALUES(%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *',
                               (uuid4(),device['id'],payload.deployment_id,payload.event_id,payload.observed_at,Jsonb(body),digest,device['is_test'])).fetchone()
            log(conn, 'lunchbox.observation.received', row['id'], 'device:' + str(device['id']))
            return acknowledgement(conn, row, False)

    @router.get('/lunchbox/observations', dependencies=operator)
    def observations(campus_id: UUID, include_test: bool = False, limit: int = Query(100,ge=1,le=500),
                     before: AwareDatetime | None = None, before_id: UUID | None = None):
        if (before is None) != (before_id is None):
            raise HTTPException(422, 'Supply both before and before_id for cursor pagination')
        with connect() as conn:
            return conn.execute('SELECT o.id,o.device_id,d.label AS device_label,o.deployment_id,o.event_id,o.observed_at,'
                                'o.received_at,o.payload,o.is_test,o.review_status, '
                                "CASE WHEN i.observation_id IS NOT NULL THEN 'stored' WHEN o.payload->>'evidence_sha256' IS NOT NULL "
                                "THEN 'pending' ELSE 'not_requested' END AS image_status "
                                'FROM lunchbox_observations o JOIN lunchbox_devices d ON d.id=o.device_id '
                                'LEFT JOIN lunchbox_observation_images i ON i.observation_id=o.id '
                                'WHERE d.campus_id=%s AND (%s OR NOT o.is_test) AND (%s::timestamptz IS NULL OR (o.observed_at,o.id)<(%s,%s)) '
                                'ORDER BY o.observed_at DESC,o.id DESC LIMIT %s', (campus_id,include_test,before,before,before_id,limit)).fetchall()

    @router.put('/lunchbox/observations/{observation_id}/image')
    async def upload_image(observation_id: UUID, request: Request, device=Depends(device_auth)):
        with connect() as conn:
            observation = conn.execute('SELECT payload FROM lunchbox_observations WHERE id=%s AND device_id=%s',
                                       (observation_id,device['id'])).fetchone()
        if observation is None:
            raise HTTPException(404, 'Observation not found')
        expected = observation['payload'].get('evidence_sha256')
        if not expected:
            raise HTTPException(409, 'Observation did not declare an image checksum')
        key = 'lunchbox-' + str(uuid4())
        temporary, final = root / (key + '.part'), root / key
        checksum, total = hashlib.sha256(), 0
        try:
            with temporary.open('xb') as output:
                async for chunk in request.stream():
                    total += len(chunk)
                    if total > 25 * 1024 * 1024:
                        raise HTTPException(413, 'Image limit is 25 MiB')
                    output.write(chunk)
                    checksum.update(chunk)
                output.flush()
                os.fsync(output.fileno())
            if checksum.hexdigest() != expected:
                raise HTTPException(422, 'Image checksum does not match the observation')
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter('error', Image.DecompressionBombWarning)
                    with Image.open(temporary) as image:
                        media_type = {'JPEG':'image/jpeg','PNG':'image/png'}.get(image.format)
                        if media_type is None:
                            raise HTTPException(415, 'LunchBox evidence must be JPEG or PNG')
                        image.verify()
            except (UnidentifiedImageError,OSError,SyntaxError,ValueError,Image.DecompressionBombError,Image.DecompressionBombWarning):
                raise HTTPException(415, 'Invalid image')
            with connect() as conn:
                conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', (str(device['id']),))
                if not conn.execute('SELECT 1 FROM lunchbox_devices WHERE id=%s AND revoked_at IS NULL', (device['id'],)).fetchone():
                    raise HTTPException(401, 'Device revoked')
                if conn.execute('SELECT 1 FROM lunchbox_observation_images WHERE observation_id=%s', (observation_id,)).fetchone():
                    return {'accepted':True,'complete':True,'duplicate':True,'image_status':'stored'}
                temporary.rename(final)
                directory_fd = os.open(root, os.O_RDONLY | os.O_DIRECTORY)
                try:
                    os.fsync(directory_fd)
                finally:
                    os.close(directory_fd)
                conn.execute('INSERT INTO lunchbox_observation_images(observation_id,storage_key,sha256,media_type,size_bytes) '
                             'VALUES(%s,%s,%s,%s,%s)', (observation_id,key,expected,media_type,total))
                log(conn, 'lunchbox.image.received', observation_id, 'device:' + str(device['id']))
            return {'accepted':True,'complete':True,'duplicate':False,'image_status':'stored'}
        except BaseException:
            final.unlink(missing_ok=True)
            raise
        finally:
            temporary.unlink(missing_ok=True)

    @router.get('/lunchbox/observations/{observation_id}/image', dependencies=operator)
    def download_image(observation_id: UUID):
        with connect() as conn:
            image = conn.execute('SELECT storage_key,media_type FROM lunchbox_observation_images WHERE observation_id=%s',
                                 (observation_id,)).fetchone()
        if image is None:
            raise HTTPException(404, 'Image not received')
        path = root / image['storage_key']
        if not path.is_file():
            raise HTTPException(503, 'Image unavailable; restore required')
        return FileResponse(path,media_type=image['media_type'],filename=str(observation_id),
                            headers={'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'})

    return router

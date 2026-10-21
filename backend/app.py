"""Private storage pilot. Shared operator token; not a production user system."""
import hashlib
import os
import secrets
import warnings
from datetime import datetime
from pathlib import Path
from typing import Annotated, Literal
from uuid import UUID, uuid4

import psycopg
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from PIL import Image, UnidentifiedImageError
from psycopg.rows import dict_row
from pydantic import BaseModel, ConfigDict, Field, field_validator

ROOT = Path(os.environ['EVIDENCE_ROOT']).resolve()
TOKEN = os.environ['OPERATOR_TOKEN']
if len(TOKEN) < 32:
    raise RuntimeError('OPERATOR_TOKEN must have at least 32 characters')
MAX_BYTES = 25 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 50_000_000
app = FastAPI(title='KBTCOE surveillance pilot', version='0.2.0')
bearer = HTTPBearer(auto_error=False)


def authorize(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]):
    if credentials is None or not secrets.compare_digest(credentials.credentials, TOKEN):
        raise HTTPException(401, 'Valid operator token required', headers={'WWW-Authenticate': 'Bearer'})


auth = [Depends(authorize)]


def connect():
    return psycopg.connect(os.environ['DATABASE_URL'], row_factory=dict_row, connect_timeout=5)


def audit(conn, action, record_id):
    conn.execute('INSERT INTO audit_events(id,action,record_id,actor) VALUES (%s,%s,%s,%s)',
                 (uuid4(), action, record_id, 'pilot-operator'))


class Input(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)


class SiteInput(Input):
    label: str = Field(min_length=1, max_length=200)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    is_test: bool = False


class SurveyInput(Input):
    name: str = Field(min_length=1, max_length=200)
    source: Literal['Drone', 'Field', 'LunchBox', 'Test']
    captured_at: datetime | None = None
    is_test: bool = False

    @field_validator('captured_at')
    @classmethod
    def timezone_required(cls, value):
        if value is not None and value.utcoffset() is None:
            raise ValueError('captured_at must include a timezone')
        return value


SITE_SELECT = ('SELECT id,label,status,is_test,created_at, '
               'ST_Y(location::geometry) AS latitude, ST_X(location::geometry) AS longitude FROM sites')


@app.get('/health')
def health():
    try:
        with connect() as conn:
            conn.execute('SELECT 1').fetchone()
        if not ROOT.is_dir() or not os.access(ROOT, os.W_OK):
            raise RuntimeError('storage unavailable')
        return {'status': 'ok', 'mode': 'private-storage-pilot'}
    except Exception:
        raise HTTPException(503, 'Database or evidence storage unavailable')


@app.post('/sites', dependencies=auth, status_code=201)
def create_site(site: SiteInput):
    record_id = uuid4()
    with connect() as conn:
        conn.execute('INSERT INTO sites(id,label,location,is_test) VALUES '
                     '(%s,%s,ST_SetSRID(ST_MakePoint(%s,%s),4326)::geography,%s)',
                     (record_id, site.label, site.longitude, site.latitude, site.is_test))
        audit(conn, 'site.created', record_id)
        return conn.execute(SITE_SELECT + ' WHERE id=%s', (record_id,)).fetchone()


@app.get('/sites', dependencies=auth)
def list_sites(include_test: bool = False, limit: int = Query(100, ge=1, le=500)):
    with connect() as conn:
        return conn.execute(SITE_SELECT + ' WHERE (%s OR NOT is_test) ORDER BY created_at DESC LIMIT %s',
                            (include_test, limit)).fetchall()


@app.get('/sites/{site_id}', dependencies=auth)
def get_site(site_id: UUID):
    with connect() as conn:
        row = conn.execute(SITE_SELECT + ' WHERE id=%s', (site_id,)).fetchone()
        if not row:
            raise HTTPException(404, 'Site not found')
        row['evidence'] = conn.execute('SELECT id,survey_id,original_name,media_type,size_bytes,sha256,note,created_at '
                                       'FROM evidence WHERE site_id=%s ORDER BY created_at', (site_id,)).fetchall()
        return row


@app.post('/surveys', dependencies=auth, status_code=201)
def create_survey(survey: SurveyInput):
    record_id = uuid4()
    with connect() as conn:
        row = conn.execute('INSERT INTO surveys(id,name,source,captured_at,is_test) VALUES (%s,%s,%s,%s,%s) '
                            'RETURNING *', (record_id, survey.name, survey.source, survey.captured_at, survey.is_test)).fetchone()
        audit(conn, 'survey.created', record_id)
        return row


@app.get('/surveys', dependencies=auth)
def list_surveys(include_test: bool = False, limit: int = Query(100, ge=1, le=500)):
    with connect() as conn:
        return conn.execute('SELECT * FROM surveys WHERE (%s OR NOT is_test) ORDER BY created_at DESC LIMIT %s',
                            (include_test, limit)).fetchall()


@app.post('/evidence', dependencies=auth, status_code=201)
async def upload_evidence(request: Request, site_id: UUID, survey_id: UUID,
                          filename: str = Query(min_length=1, max_length=200),
                          note: str = Query(min_length=1, max_length=2000)):
    # Raw streaming avoids spooling multi-gigabyte imagery to the SSD. Pilot limit: 25 MiB.
    with connect() as conn:
        if not conn.execute('SELECT 1 FROM sites WHERE id=%s', (site_id,)).fetchone():
            raise HTTPException(404, 'Site not found')
        if not conn.execute('SELECT 1 FROM surveys WHERE id=%s', (survey_id,)).fetchone():
            raise HTTPException(404, 'Survey not found')
    record_id = uuid4()
    temporary = ROOT / f'{record_id}.part'
    final = ROOT / str(record_id)
    total = 0
    checksum = hashlib.sha256()
    try:
        with temporary.open('xb') as handle:
            async for chunk in request.stream():
                total += len(chunk)
                if total > MAX_BYTES:
                    raise HTTPException(413, 'Pilot uploads are limited to 25 MiB')
                handle.write(chunk)
                checksum.update(chunk)
            handle.flush()
            os.fsync(handle.fileno())
        try:
            with warnings.catch_warnings():
                warnings.simplefilter('error', Image.DecompressionBombWarning)
                with Image.open(temporary) as image:
                    media_type = {'JPEG': 'image/jpeg', 'PNG': 'image/png', 'TIFF': 'image/tiff'}.get(image.format)
                    if media_type is None:
                        raise HTTPException(415, 'Only JPEG, PNG and TIFF images are supported')
                    image.verify()
        except (UnidentifiedImageError, OSError, SyntaxError, ValueError,
                Image.DecompressionBombError, Image.DecompressionBombWarning):
            raise HTTPException(415, 'Invalid, unsupported or oversized image dimensions')
        temporary.rename(final)
        directory_fd = os.open(ROOT, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
        with connect() as conn:
            row = conn.execute('INSERT INTO evidence '
                                '(id,site_id,survey_id,original_name,storage_key,media_type,size_bytes,sha256,note) '
                                'VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id,sha256,size_bytes,media_type',
                                (record_id,site_id,survey_id,Path(filename.replace('\\','/')).name,
                                 str(record_id),media_type,total,checksum.hexdigest(),note)).fetchone()
            audit(conn, 'evidence.created', record_id)
        return row
    except BaseException:
        temporary.unlink(missing_ok=True)
        final.unlink(missing_ok=True)
        raise


@app.get('/evidence/{evidence_id}/file', dependencies=auth)
def download_evidence(evidence_id: UUID):
    with connect() as conn:
        row = conn.execute('SELECT storage_key,media_type FROM evidence WHERE id=%s', (evidence_id,)).fetchone()
    if not row:
        raise HTTPException(404, 'Evidence not found')
    path = ROOT / row['storage_key']
    if not path.is_file():
        raise HTTPException(503, 'Evidence file unavailable; restore required')
    return FileResponse(path, media_type=row['media_type'], filename=str(evidence_id),
                        headers={'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store'})


from lunchbox import create_router
app.include_router(create_router(connect, authorize, ROOT))

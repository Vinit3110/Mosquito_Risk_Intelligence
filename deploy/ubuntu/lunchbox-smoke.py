"""Exercise device isolation, offline retries and image evidence against the real API."""
import concurrent.futures
import hashlib
import json
import os
import sqlite3
import subprocess
import struct
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import zlib
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

settings = dict(line.split('=',1) for line in Path('.env').read_text().splitlines() if '=' in line)
operator = settings['OPERATOR_TOKEN']


def call(method, path, payload=None, token=operator, expected=200, raw=False):
    data = payload if raw else (json.dumps(payload).encode() if payload is not None else None)
    headers = {'Authorization': 'Bearer ' + token} if token else {}
    if data is not None and not raw:
        headers['Content-Type'] = 'application/json'
    request = urllib.request.Request('http://127.0.0.1:8091' + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request,timeout=45) as response:
            status, body = response.status, response.read()
    except urllib.error.HTTPError as response:
        status, body = response.code, response.read()
    assert status == expected, (method,path,status,body[:350])
    return body if raw else json.loads(body)


def verify_retained(report):
    rows = call('GET','/lunchbox/observations?' + urllib.parse.urlencode({'campus_id':report['campus_id'],'include_test':'true'}))
    row = next(item for item in rows if item['id'] == report['observation_id'])
    assert row['is_test'] and row['review_status'] == 'unreviewed' and row['image_status'] == 'stored'
    image = call('GET',f"/lunchbox/observations/{report['observation_id']}/image",raw=True)
    assert hashlib.sha256(image).hexdigest() == report['sha256']


if __name__ == '__main__':
    import sys
    if '--verify-only' in sys.argv:
        verify_retained(json.loads(Path('lunchbox-validation-record.json').read_text()))
        print('PASS: retained LunchBox observation, test flag, unreviewed status and image bytes')
        raise SystemExit(0)
    campus = next(row for row in call('GET','/campuses') if row['code']=='KBTCOE')
    detail = call('GET','/campuses/' + campus['id'])
    assert len(detail['surveys']) == 1 and len(detail['areas']) == 4
    assert sum(row['raw_images'] for row in detail['areas']) == 374
    assert sum(row['processed_assets'] for row in detail['areas']) == 24
    created = []
    try:
        for label in ('SIMULATED STORAGE TEST A','SIMULATED STORAGE TEST B'):
            device = call('POST','/lunchbox/devices',{'campus_id':campus['id'],'label':label,'is_test':True},expected=201)
            created.append(device)
        first, second = created
        now = datetime.now(timezone.utc)
        deployment_payload = {'device_id':first['id'],'area_id':detail['areas'][0]['id'],
                              'latitude':20.0171,'longitude':73.763,'coordinate_quality':'Approximate',
                              'starts_at':(now-timedelta(hours=2)).isoformat()}
        deployment = call('POST','/lunchbox/deployments',deployment_payload,expected=201)
        call('POST','/lunchbox/deployments',deployment_payload,expected=409)
        def chunk(kind,data):
            return struct.pack('!I',len(data))+kind+data+struct.pack('!I',zlib.crc32(kind+data))
        image = b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',1,1,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b'\0\x20\x80\x40'))+chunk(b'IEND',b'')
        payload = {'event_id':str(uuid4()),'deployment_id':deployment['id'],
                   'observed_at':(now-timedelta(minutes=30)).isoformat(),
                   'interval_start':(now-timedelta(minutes=31)).isoformat(),
                   'interval_end':(now-timedelta(minutes=30)).isoformat(),
                   'count_basis':'frame_count','processing_status':'ok','mosquito_count':3,
                   'species_counts':[{'label':'unknown','count':3,'confidence':None}],
                   'model_name':'synthetic-test-only','model_version':'no-model-run',
                   'evidence_sha256':hashlib.sha256(image).hexdigest()}
        call('POST','/lunchbox/observations',payload,token='',expected=401)
        call('POST','/lunchbox/observations',payload,token=operator,expected=401)
        call('POST','/lunchbox/observations',payload,token=second['token'],expected=403)
        call('GET','/campuses',token=first['token'],expected=401)
        accepted = call('POST','/lunchbox/observations',payload,token=first['token'],expected=201)
        assert not accepted['complete'] and accepted['image_status']=='pending'
        # Parallel retries must reuse one observation and one audit record.
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            retries = list(pool.map(lambda _: call('POST','/lunchbox/observations',payload,token=first['token']),range(4)))
        assert all(row['duplicate'] and row['id']==accepted['id'] for row in retries)
        call('POST','/lunchbox/observations',{**payload,'model_version':'changed'},token=first['token'],expected=409)
        for change in ({'mosquito_count':-1},{'mosquito_count':True},{'mosquito_count':2},
                       {'observed_at':'2026-08-19T09:00:00'},{'processing_status':'inference_failed'},
                       {'is_test':False},{'count_basis':'unexplained-total'}):
            call('POST','/lunchbox/observations',{**payload,**change,'event_id':str(uuid4())},token=first['token'],expected=422)
        image_path = '/lunchbox/observations/' + accepted['id'] + '/image'
        call('PUT',image_path,b'wrong bytes',token=first['token'],expected=422,raw=True)
        call('PUT',image_path,image,token=second['token'],expected=404,raw=True)
        stored = json.loads(call('PUT',image_path,image,token=first['token'],raw=True))
        assert stored['complete'] and not stored['duplicate']
        repeated = json.loads(call('PUT',image_path,image,token=first['token'],raw=True))
        assert repeated['duplicate']
        ack = call('POST','/lunchbox/observations',payload,token=first['token'])
        assert ack['complete'] and ack['image_status']=='stored'
        report = {'campus_id':campus['id'],'observation_id':accepted['id'], 'sha256':payload['evidence_sha256']}
        verify_retained(report)
        rows = call('GET','/lunchbox/observations?campus_id='+campus['id'])
        assert accepted['id'] not in [row['id'] for row in rows]
        assert not call('GET','/lunchbox/devices?campus_id='+campus['id'])
        call('POST',f"/lunchbox/deployments/{deployment['id']}/close",{'ends_at':(now-timedelta(minutes=45)).isoformat()},expected=409)
        call('POST',f"/lunchbox/deployments/{deployment['id']}/close",{'ends_at':(now-timedelta(minutes=10)).isoformat()})
        late = {**payload,'event_id':str(uuid4()),'evidence_sha256':None}
        call('POST','/lunchbox/observations',late,token=first['token'],expected=201)
        for result in ({'processing_status':'ok','mosquito_count':0,'species_counts':[]},
                       {'processing_status':'capture_failed','mosquito_count':None,'species_counts':[]}):
            call('POST','/lunchbox/observations',{**late,**result,'event_id':str(uuid4())},token=first['token'],expected=201)
        call('POST','/lunchbox/observations',{**late,'event_id':str(uuid4()),'observed_at':now.isoformat(),
                                          'interval_end':now.isoformat()},token=first['token'],expected=422)
        # Reference device client retains its queue through a network failure, then completes upload.
        client = Path(__file__).resolve().parents[2] / 'tools/lunchbox_outbox.py'
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            event_file, image_file = directory/'event.json', directory/'image.png'
            event_file.write_text(json.dumps({**payload,'event_id':str(uuid4())}))
            image_file.write_bytes(image)
            env = {**os.environ,'LUNCHBOX_OUTBOX':str(directory/'outbox.sqlite3'),
                   'LUNCHBOX_TOKEN':first['token'],'LUNCHBOX_API_URL':'http://127.0.0.1:1'}
            subprocess.run([sys.executable,str(client),'enqueue',str(event_file),'--image',str(image_file)],env=env,check=True)
            subprocess.run([sys.executable,str(client),'flush'],env=env,check=True)
            with sqlite3.connect(env['LUNCHBOX_OUTBOX']) as queue:
                assert queue.execute('SELECT sent FROM outbox').fetchone()[0]==0
            env['LUNCHBOX_API_URL']='http://127.0.0.1:8091'
            subprocess.run([sys.executable,str(client),'flush'],env=env,check=True)
            with sqlite3.connect(env['LUNCHBOX_OUTBOX']) as queue:
                assert queue.execute('SELECT sent FROM outbox').fetchone()[0]==1
        Path('lunchbox-validation-record.json').write_text(json.dumps(report,indent=2)+'\n')
        print('PASS: KBTCOE/398 verified assets, device isolation, concurrent retry deduplication, conflict detection, validation,')
        print('image checksum/upload retries, hidden test data, deployment closure, delayed uploads and durable offline outbox')
    finally:
        for device in created:
            call('POST',f"/lunchbox/devices/{device['id']}/revoke")
        if created:
            call('POST','/lunchbox/observations',payload,token=created[0]['token'],expected=401)
    print('PASS: revoked test credentials cannot submit; no real device was provisioned')

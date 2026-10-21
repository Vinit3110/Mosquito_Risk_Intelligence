"""End-to-end checks using explicitly synthetic records, hidden from normal lists."""
import hashlib
import json
import struct
import urllib.error
import urllib.parse
import urllib.request
import zlib
from datetime import datetime, timezone
from pathlib import Path

BASE = 'http://127.0.0.1:8091'
settings = dict(line.split('=', 1) for line in Path('.env').read_text().splitlines() if '=' in line)
TOKEN = settings['OPERATOR_TOKEN']


def call(method, path, payload=None, expected=200, authorized=True, raw=False):
    headers = {'Authorization': f'Bearer {TOKEN}'} if authorized else {}
    if payload is not None and not raw:
        payload = json.dumps(payload).encode()
        headers['Content-Type'] = 'application/json'
    request = urllib.request.Request(BASE + path, data=payload, method=method, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=40) as response:
            status, body = response.status, response.read()
    except urllib.error.HTTPError as response:
        status, body = response.code, response.read()
    assert status == expected, (method, path.split('?')[0], status, body[:300])
    return body if raw else json.loads(body)


def verify_saved(report):
    site = call('GET', f"/sites/{report['site_id']}")
    assert site['is_test'] and site['label'].startswith('STORAGE TEST ONLY')
    assert any(row['id'] == report['evidence_id'] for row in site['evidence'])
    data = call('GET', f"/evidence/{report['evidence_id']}/file", raw=True)
    assert hashlib.sha256(data).hexdigest() == report['sha256']


if __name__ == '__main__':
    import sys
    if '--verify-only' in sys.argv:
        report = json.loads(Path('validation-record.json').read_text())
        verify_saved(report)
        print('PASS: retained site, survey link and exact evidence bytes after restart')
        raise SystemExit(0)
    call('GET', '/health')
    call('GET', '/sites', authorized=False, expected=401)
    call('POST', '/sites', {'label': 'invalid', 'latitude': 91, 'longitude': 0}, expected=422)
    stamp = datetime.now(timezone.utc).isoformat()
    survey = call('POST', '/surveys', {'name': f'STORAGE TEST ONLY {stamp}', 'source': 'Test', 'is_test': True}, expected=201)
    site = call('POST', '/sites', {'label': f'STORAGE TEST ONLY {stamp}', 'latitude': 19.9975,
                                  'longitude': 73.7898, 'is_test': True}, expected=201)
    assert site['id'] not in [row['id'] for row in call('GET', '/sites')]
    # Construct a tiny PNG with Python standard library; never a field observation.
    def chunk(kind, data):
        return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data))
    image = (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', 1, 1, 8, 2, 0, 0, 0))
             + chunk(b'IDAT', zlib.compress(b'\0\x20\x80\x40')) + chunk(b'IEND', b''))
    query = urllib.parse.urlencode({'site_id': site['id'], 'survey_id': survey['id'],
                                   'filename': 'synthetic-storage-check.png',
                                   'note': 'Synthetic storage validation only; no surveillance finding.'})
    evidence = call('POST', '/evidence?' + query, image, expected=201, raw=True)
    evidence = json.loads(evidence)
    call('POST', '/evidence?' + query, b'not an image', expected=415, raw=True)
    call('POST', '/evidence?' + query, b'x' * (25 * 1024 * 1024 + 1), expected=413, raw=True)
    call('GET', f"/evidence/{evidence['id']}/file", authorized=False, expected=401, raw=True)
    report = {'site_id': site['id'], 'survey_id': survey['id'], 'evidence_id': evidence['id'],
              'sha256': hashlib.sha256(image).hexdigest(), 'validated_at': stamp, 'is_test': True}
    assert evidence['sha256'] == report['sha256']
    verify_saved(report)
    assert not list(Path(settings['EVIDENCE_DIR']).glob('*.part'))
    Path('validation-record.json').write_text(json.dumps(report, indent=2) + '\n')
    print('PASS: authenticated writes/reads, coordinates, hidden test data, image validation, size limit and exact file checksum')
    print('Synthetic validation IDs saved to validation-record.json; no real findings created.')

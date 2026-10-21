"""Verify existing server bytes before registering assets. Never move source imagery."""
import hashlib
import json
import subprocess
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

deployment = Path(__file__).resolve().parent
manifest = json.loads((deployment / 'kbtcoe-manifest.json').read_text())
roots = {'raw': Path('/data/Arsha_Project/Drone_First_Flight'),
         'processed': Path('/data/Arsha_Project/Photogrammetry/Drone_First_Flight')}


def uid(key):
    return str(uuid5(NAMESPACE_URL, 'mosquito-surveillance:kbtcoe:' + key))


def literal(value):
    return "'" + str(value).replace("'", "''") + "'"


campus_id, survey_id = uid('campus'), uid('survey:2026-08-19:first')
statements = ['BEGIN;', 'SELECT pg_advisory_xact_lock(7310421);',
              f"INSERT INTO campuses(id,code,name) VALUES('{campus_id}','KBTCOE','KBTCOE') ON CONFLICT DO NOTHING;",
              f"INSERT INTO surveys(id,name,source,is_test,campus_id,capture_date) VALUES('{survey_id}',"
              f"'KBTCOE — First drone survey','Drone',false,'{campus_id}','2026-08-19') ON CONFLICT DO NOTHING;"]
total = 0
for area in manifest['areas']:
    area_id = uid('area:' + area['code'])
    statements.append(f"INSERT INTO survey_areas(id,survey_id,code,name,bounds,source_crs) VALUES('{area_id}',"
                      f"'{survey_id}',{literal(area['code'])},{literal(area['name'])},"
                      f"{literal(json.dumps(area['bounds']))}::jsonb,{literal(area['source_crs'])}) ON CONFLICT DO NOTHING;")
    for asset in area['assets']:
        prefix, relative = asset['relative_path'].split('/', 1)
        root = roots[prefix].resolve()
        path = (root / relative).resolve()
        if not path.is_relative_to(root) or not path.is_file() or path.stat().st_size != asset['size_bytes']:
            raise SystemExit(f'Missing or size-mismatched asset: {asset["relative_path"]}')
        with path.open('rb') as source:
            digest = hashlib.file_digest(source, 'sha256').hexdigest()
        if digest != asset['sha256']:
            raise SystemExit(f'Checksum mismatch: {asset["relative_path"]}')
        asset_id = uid('asset:' + asset['relative_path'])
        statements.append(f"INSERT INTO survey_assets(id,area_id,kind,relative_path,size_bytes,sha256) VALUES("
                          f"'{asset_id}','{area_id}',{literal(asset['kind'])},{literal(asset['relative_path'])},"
                          f"{asset['size_bytes']},{literal(digest)}) ON CONFLICT DO NOTHING;")
        total += 1
    print('Verified bytes:', area['name'], flush=True)
statements.append('COMMIT;')
result = subprocess.run(['docker','compose','exec','-T','database','psql','-v','ON_ERROR_STOP=1',
                         '-U','mosquito_admin','-d','mosquito'], cwd=deployment,
                        input='\n'.join(statements), text=True, capture_output=True)
if result.returncode:
    raise SystemExit(result.stderr)
print(f'Registered KBTCOE, one survey, four areas and {total} SHA-256 verified assets. Original files unchanged.')

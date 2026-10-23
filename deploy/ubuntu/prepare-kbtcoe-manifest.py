"""Local read-only inventory; hashes original files without regenerating any dataset."""
import hashlib
import json
from pathlib import Path

project = Path(__file__).resolve().parents[2]
flight = project / 'Drone_First_Flight' / 'data'
layers = json.loads((project / 'frontend/public/drone/surveys.json').read_text())
areas = []
for layer in layers:
    code = layer['id'][-1].upper()
    files = []
    roots = [(flight / 'raw_dng' / f'Area_{code}_Images', 'raw', '*.DNG'),
             (flight / 'photogrammetry' / f'Area_{code}', 'processed', '*')]
    for directory, kind, pattern in roots:
        for path in sorted(directory.glob(pattern)):
            if not path.is_file():
                continue
            with path.open('rb') as source:
                digest = hashlib.file_digest(source, 'sha256').hexdigest()
            relative = f'raw/{path.name}' if kind == 'raw' else f'processed/Area_{code}/{path.name}'
            files.append({'relative_path': relative, 'kind': kind, 'size_bytes': path.stat().st_size, 'sha256': digest})
    areas.append({'code': code, 'name': f'Area {code}', 'bounds': layer['bounds'],
                  'source_crs': layer['sourceCrs'], 'assets': files})
    print(f'Hashed Area {code}: {len(files)} assets', flush=True)
manifest = {'campus': 'KBTCOE', 'survey': 'First drone survey', 'capture_date': '2026-08-19',
            'capture_timezone': None, 'areas': areas}
destination = Path(__file__).with_name('kbtcoe-manifest.json')
destination.write_text(json.dumps(manifest, indent=2) + '\n')
print('Saved', destination)

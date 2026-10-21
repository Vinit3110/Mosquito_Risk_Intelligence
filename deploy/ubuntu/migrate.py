"""Apply additive, repeatable migrations through the pilot database administrator."""
import subprocess
from pathlib import Path

deployment = Path(__file__).resolve().parent
for migration in sorted((deployment.parents[1] / 'backend' / 'migrations').glob('*.sql')):
    with migration.open('rb') as source:
        subprocess.run(['docker','compose','exec','-T','database','psql','-v','ON_ERROR_STOP=1',
                        '-U','mosquito_admin','-d','mosquito'], cwd=deployment, stdin=source, check=True)
    print('Applied:', migration.name)

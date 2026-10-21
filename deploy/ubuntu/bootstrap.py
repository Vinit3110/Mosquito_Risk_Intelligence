"""Run on Ubuntu as kbtcoe. No sudo, credentials printed, or existing data changed."""
import os
import secrets
from pathlib import Path

base = Path.home() / 'mosquito-surveillance'
deployment = base / 'deploy' / 'ubuntu'
storage = Path('/data/Arsha_Project/mosquito-surveillance')
for directory in (base / 'postgres', storage / 'evidence', storage / 'backups'):
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
environment = deployment / '.env'
if not environment.exists():
    values = {
        'DB_ADMIN_PASSWORD': secrets.token_hex(32),
        'APP_DB_PASSWORD': secrets.token_hex(32),
        'OPERATOR_TOKEN': secrets.token_hex(32),
        'DATABASE_DIR': str(base / 'postgres'),
        'EVIDENCE_DIR': str(storage / 'evidence'),
        'BACKUP_DIR': str(storage / 'backups'),
    }
    fd = os.open(environment, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as handle:
        handle.write(''.join(f'{key}={value}\n' for key, value in values.items()))
print('Pilot directories and protected configuration ready. No secrets printed.')

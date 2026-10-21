"""Restore into a new disposable database and directory; never replace live data."""
import hashlib
import json
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path
from uuid import UUID, uuid4

deployment = Path(__file__).resolve().parent
settings = dict(line.split('=', 1) for line in (deployment / '.env').read_text().splitlines() if '=' in line)
backup_root = Path(settings['BACKUP_DIR']).resolve()
backup = Path(sys.argv[1]).resolve()
if backup.parent != backup_root or not backup.is_dir():
    raise SystemExit('Select a timestamped backup directly inside BACKUP_DIR')
report = json.loads((deployment / 'validation-record.json').read_text())
evidence_id = str(UUID(report['evidence_id']))
database = 'restore_check_' + uuid4().hex
compose = ['docker', 'compose', '--project-directory', str(deployment), '-f', str(deployment / 'compose.yaml')]
dbexec = compose + ['exec', '-T', 'database']


def run(args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)


run(['sha256sum', '-c', 'SHA256SUMS'], cwd=backup)
run(dbexec + ['createdb', '-U', 'mosquito_admin', database])
try:
    with (backup / 'database.dump').open('rb') as dump:
        run(dbexec + ['pg_restore', '--exit-on-error', '-U', 'mosquito_admin', '-d', database], stdin=dump)
    query = ("SELECT row_to_json(t) FROM (SELECT e.sha256,e.storage_key,s.is_test,"
             "(SELECT count(*) FROM audit_events) AS audit_count "
             "FROM evidence e JOIN sites s ON s.id=e.site_id JOIN surveys v ON v.id=e.survey_id "
             f"WHERE e.id='{evidence_id}'::uuid) t")
    output = subprocess.check_output(dbexec + ['psql', '-U', 'mosquito_admin', '-d', database, '-Atc', query], text=True)
    row = json.loads(output)
    assert row['sha256'] == report['sha256'] and row['is_test'] and row['audit_count'] >= 3
    assert row['storage_key'] == evidence_id
    with tempfile.TemporaryDirectory(prefix='restore-check-', dir=backup_root) as temporary:
        with tarfile.open(backup / 'evidence.tar.gz', 'r:gz') as archive:
            archive.extractall(temporary, filter='data')
        content = (Path(temporary) / evidence_id).read_bytes()
        assert hashlib.sha256(content).hexdigest() == row['sha256']
        lunchbox_report = deployment / 'lunchbox-validation-record.json'
        if lunchbox_report.exists():
            observation = json.loads(lunchbox_report.read_text())
            observation_id = str(UUID(observation['observation_id']))
            query = ("SELECT row_to_json(t) FROM (SELECT i.storage_key,i.sha256,o.is_test,o.review_status "
                     "FROM lunchbox_observation_images i JOIN lunchbox_observations o ON o.id=i.observation_id "
                     f"WHERE o.id='{observation_id}'::uuid) t")
            restored = json.loads(subprocess.check_output(dbexec + ['psql','-U','mosquito_admin','-d',database,'-Atc',query],text=True))
            assert restored['is_test'] and restored['review_status']=='unreviewed'
            assert restored['sha256']==observation['sha256']
            assert hashlib.sha256((Path(temporary)/restored['storage_key']).read_bytes()).hexdigest()==restored['sha256']
            print('PASS: restored LunchBox observation, review/test status and image checksum')
    print('PASS: isolated database restore, linked survey/site/evidence, audit history and restored file checksum')
finally:
    run(dbexec + ['dropdb', '-U', 'mosquito_admin', database])

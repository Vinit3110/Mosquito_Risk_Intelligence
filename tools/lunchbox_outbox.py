"""Reference device outbox: durable SQLite queue, immutable events and retry-safe uploads.

Queue a JSON observation: python lunchbox_outbox.py enqueue event.json [--image capture.png]
Send queued events:      python lunchbox_outbox.py flush
Configuration: LUNCHBOX_API_URL, LUNCHBOX_TOKEN, LUNCHBOX_OUTBOX (optional).
Use a dedicated database per physical device. UUID event_id must be generated once at capture.
"""
import argparse
import hashlib
import json
import os
import sqlite3
import urllib.error
import urllib.request
from pathlib import Path
from uuid import UUID


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action',choices=['enqueue','flush'])
    parser.add_argument('event',nargs='?')
    parser.add_argument('--image')
    args = parser.parse_args()
    destination = Path(os.environ.get('LUNCHBOX_OUTBOX','lunchbox-outbox.sqlite3'))
    with sqlite3.connect(destination) as conn:
        conn.execute('PRAGMA journal_mode=WAL')
        conn.execute('PRAGMA synchronous=FULL')
        conn.execute('CREATE TABLE IF NOT EXISTS outbox(event_id TEXT PRIMARY KEY,payload TEXT NOT NULL,image BLOB,sent INTEGER NOT NULL DEFAULT 0)')
        if args.action=='enqueue':
            if not args.event:
                parser.error('enqueue requires an event JSON file')
            event = json.loads(Path(args.event).read_text())
            event_id = str(UUID(event['event_id']))
            image = Path(args.image).read_bytes() if args.image else None
            if image is not None:
                if len(image)>25*1024*1024:
                    parser.error('image exceeds the server 25 MiB limit')
                event['evidence_sha256'] = hashlib.sha256(image).hexdigest()
            elif event.get('evidence_sha256'):
                parser.error('declared evidence requires --image so bytes are durably queued')
            payload = json.dumps(event,sort_keys=True,separators=(',',':'))
            old = conn.execute('SELECT payload,image FROM outbox WHERE event_id=?',(event_id,)).fetchone()
            if old is not None and old!=(payload,image):
                raise SystemExit('Event ID already queued with different content')
            conn.execute('INSERT OR IGNORE INTO outbox(event_id,payload,image) VALUES(?,?,?)',(event_id,payload,image))
            print('Observation durably queued:',event_id)
            return
        base = os.environ['LUNCHBOX_API_URL'].rstrip('/')
        if not base.startswith(('https://','http://127.0.0.1:','http://localhost:')):
            raise SystemExit('Use HTTPS or a loopback SSH tunnel; refusing plaintext remote credentials')
        token = os.environ['LUNCHBOX_TOKEN']
        def send(method,path,data,content_type):
            request = urllib.request.Request(base+path,data=data,method=method,
                       headers={'Authorization':'Bearer '+token,'Content-Type':content_type})
            with urllib.request.urlopen(request,timeout=60) as response:
                return json.loads(response.read())
        for event_id,payload,image in conn.execute('SELECT event_id,payload,image FROM outbox WHERE sent=0 ORDER BY rowid').fetchall():
            try:
                ack = send('POST','/lunchbox/observations',payload.encode(),'application/json')
                if not ack.get('accepted'):
                    raise RuntimeError('Server did not acknowledge event')
                if not ack.get('complete'):
                    if image is None:
                        raise RuntimeError('Image pending but local bytes unavailable')
                    ack = send('PUT',f"/lunchbox/observations/{ack['id']}/image",image,'application/octet-stream')
                if not ack.get('complete'):
                    raise RuntimeError('Server has not acknowledged the complete evidence')
                conn.execute('UPDATE outbox SET sent=1 WHERE event_id=?',(event_id,))
                conn.commit()
                print('Acknowledged:',event_id)
            except urllib.error.HTTPError as failure:
                # A conflict needs human/device correction; never silently replace its ID or evidence.
                print(f'Pending: {event_id}; HTTP {failure.code}. Retained for retry or investigation.')
                break
            except (OSError,ValueError,RuntimeError) as failure:
                print(f'Pending: {event_id}; {type(failure).__name__}. Retained for retry.')
                break


if __name__=='__main__':
    main()

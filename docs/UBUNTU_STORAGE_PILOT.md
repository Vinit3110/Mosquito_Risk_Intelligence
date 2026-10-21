# Ubuntu persistent storage pilot

This is a private backend foundation, separate from WebODM. The new `/lunchbox` dashboard page reads KBTCOE's registered survey and device observations from it. Overview and Sites & Map retain their demo surveillance records. Device-scoped LunchBox ingestion is implemented and tested with simulations; no physical LunchBox, operational field workflow, chatbot, per-user accounts or public production upload service is deployed. See [the LunchBox contract and setup](LUNCHBOX_INTEGRATION.md).

## Server layout

| Purpose | Server location |
| --- | --- |
| Source and deployment | `/home/kbtcoe/mosquito-surveillance` |
| PostgreSQL/PostGIS database on NVMe-backed root filesystem | `/home/kbtcoe/mosquito-surveillance/postgres` |
| HDD evidence files | `/data/Arsha_Project/mosquito-surveillance/evidence` |
| HDD backup snapshots | `/data/Arsha_Project/mosquito-surveillance/backups` |
| Protected credentials | `/home/kbtcoe/mosquito-surveillance/deploy/ubuntu/.env` |

Docker project: `mosquito-storage-pilot`. The database has no published host port. The API is published only on Ubuntu loopback at `127.0.0.1:8091`. No existing WebODM containers or database are reused. Images and container build layers also consume SSD space in Docker's existing root directory.

## Executed validation — 21 October 2026

Validated on `kbt-server`: authenticated survey/site creation, evidence upload and exact-byte download; rejection of unauthenticated requests, invalid coordinates, invalid image content and uploads above 25 MiB; exclusion of synthetic records from normal listings; retained records/files after restarting both pilot containers; coordinated database/file backup and isolated restore with verified checksums, record relationships and audit history. Existing WebODM containers retained their uptime. Available disk space after initial deployment was approximately 33 GiB on root and 816 GiB on `/data`.

Initial verified backup: `/data/Arsha_Project/mosquito-surveillance/backups/20261021T012701Z`. This is a manual validation snapshot, not a scheduled or external backup.

After the KBTCOE/LunchBox addition, all 398 survey assets were matched by SHA-256; device isolation, parallel retry deduplication, image acknowledgements, zero/failure distinction, closed-deployment delayed uploads, credential revocation and offline outbox recovery passed against the real API. The 26-test frontend suite, lint and build were checked; the real Ubuntu API was also read through the local frontend on desktop/mobile. The post-integration backup `/data/Arsha_Project/mosquito-surveillance/backups/20261021T021053Z` restored successfully with the LunchBox image/checksum and unreviewed/test flags intact. Synthetic device credentials were revoked after testing. No real ground observations were created.

## Access from Windows

Keep an SSH tunnel open in PowerShell:

```powershell
ssh -N -L 8091:127.0.0.1:8091 kbt-server
```

Open [API documentation](http://127.0.0.1:8091/docs) or [health status](http://127.0.0.1:8091/health). If local port 8091 is occupied, use `-L 18091:127.0.0.1:8091` and open port 18091 locally.

To view the pilot operator token privately on your own terminal:

```powershell
ssh kbt-server "sed -n 's/^OPERATOR_TOKEN=//p' ~/mosquito-surveillance/deploy/ubuntu/.env"
```

Use **Authorize** in the API docs or connect through `/lunchbox` in the local frontend and enter that token. Do not send it in chat, commit it, or add it to a Vite environment variable: Vite variables are included in browser assets. This is a shared operator credential suitable only for a private pilot. Operator actions are attributed to `pilot-operator`; device ingestion records the device ID. Device-specific credentials and isolation now exist; individual officer accounts and permissions remain required before operational use.

## API scope

- `POST /surveys`: name, source (`Drone`, `Field`, `LunchBox`, `Test`), optional timezone-qualified capture time and `is_test`.
- `GET /surveys`: newest surveys, hiding tests by default.
- `POST /sites`: label, latitude, longitude, `is_test`; creates a `Potential` site.
- `GET /sites`: newest sites, hiding tests by default.
- `GET /sites/{id}`: site and linked evidence metadata.
- `POST /evidence`: send **raw image bytes** as the request body, with `site_id`, `survey_id`, `filename` and `note` query parameters. It is not a multipart form endpoint.
- `GET /evidence/{id}/file`: authenticated download.

Uploads are limited to 25 MiB and 50 million pixels, allowing JPEG, PNG and TIFF image formats after content checks. This is an evidence-image endpoint, not a bulk GeoTIFF, tiled-survey, point-cloud or raw-drone ingestion pipeline. It does not promise geospatial validation, virus scanning or AI analysis. The original client filename is metadata; generated UUIDs determine storage paths. The backend retains SHA-256, file size and an audit event. Human review and site-state transitions are future work.

The synthetic storage check is marked `is_test=true` on its survey and site, has source `Test`, and does not represent a real observation. To view it, request `/sites?include_test=true`. The real college survey is registered separately by checksum-verified references to the existing imagery; this image-upload endpoint does not import it.

## Operations

On Ubuntu:

```sh
cd ~/mosquito-surveillance/deploy/ubuntu
docker compose ps
docker compose logs --tail=50 api
python3 smoke.py --verify-only
```

`python3 smoke.py` creates a **new** synthetic validation record and checks unauthenticated access, coordinate validation, normal-list exclusion, valid/invalid image upload, upload-size rejection, exact download bytes and evidence linkage. Use `--verify-only` for routine checks without adding records.

The initial SQL and migrations run when PostgreSQL's data directory is empty. Existing deployments apply additive migrations with `python3 migrate.py`; editing `schema.sql` alone does not migrate an existing database. The API role can read/insert application records and has narrowly scoped update rights for device revocation and deployment closure; it cannot administer the database. Dependencies are recorded in `backend/requirements.lock.txt`; the Dockerfile installs that lock. Record image digests before an upgrade.

## Backup and isolated restore check

Run on Ubuntu from the deployment directory:

```sh
sh backup.sh
python3 verify-restore.py /data/Arsha_Project/mosquito-surveillance/backups/TIMESTAMP
```

`backup.sh` briefly stops **only the pilot API**, dumps PostgreSQL, archives evidence, writes SHA-256 manifests and restarts the API on exit. This snapshot strategy assumes the API is the only evidence/database writer. It must be revised before adding device ingestion workers or other writers. Run it only while the pilot API is intended to be running.

`verify-restore.py` validates the manifest, restores the dump to a uniquely named temporary database in the pilot database container, extracts evidence to a temporary HDD directory, checks the synthetic record, its linked site/survey, audit history and exact file checksum, then removes those temporary restore resources. It does not replace the live database or evidence.

These snapshots are on the same HDD as the evidence. **External backups and scheduled backup retention are not configured.** Copy snapshots and a separately protected copy of configuration/source to a different physical device or remote host. The `.env` contains secrets and must be backed up securely, outside public file storage. Disk monitoring and backup scheduling are required before real operational data intake.

For disaster recovery, deploy the same source/image versions to a clean destination, recreate roles/configuration, restore the database dump into a new empty database, restore the evidence archive into its matching directory, verify checksums/linkage, then switch the API to that recovered pair. Never restore over the only live copy.

## Next integration steps

1. Add individual user authentication and complete live-data integration beyond the new `/lunchbox` page.
2. Extend the real survey registry with controlled bulk import, asset delivery and source-imagery backups.
3. Provision the actual LunchBox, its measured deployment location, model contract, network access and supervised outbox service.
4. Add assignments, review decisions, intervention/follow-up records and state-transition validation.
5. Add approved documents and permission-aware retrieval for chatbot answers, with live operational queries routed through the backend.

# KBTCOE survey and LunchBox ingestion

## Registered baseline

KBTCOE is the parent campus. Its first drone survey has capture date **19 August 2026**, four areas A–D, **374 DNG originals** (100/18/248/8) and **24 processed assets** (six per area). All 398 files were SHA-256 matched between the local workspace and existing server copies before registration. No source imagery was moved or duplicated.

The source-of-truth manifest is `deploy/ubuntu/kbtcoe-manifest.json`. Original captures resolve below `/data/Arsha_Project/Drone_First_Flight`; processed assets resolve below `/data/Arsha_Project/Photogrammetry/Drone_First_Flight`. Other captures/videos in those directories are not automatically registered. The raw file area assignments come from the local curated folders. Capture timezone and exact survey start/end remain unspecified; date-only metadata is not converted into an invented UTC timestamp. Coverage bounds are from the existing map layer metadata, not an official campus boundary. The database registry records file identity, not independent positional validation.

There are no real device deployments or ground observations yet. A LunchBox event is a model observation, not a human review or a verified-site decision. Ground verification remains `not_recorded`; this version does not implement human review transitions.

## Dashboard access

1. Keep `ssh -N -L 8091:127.0.0.1:8091 kbt-server` running on Windows.
2. Start the existing frontend with `npm run dev`.
3. Open `/lunchbox` using the **KBTCOE · LunchBox** navigation item.
4. Enter the pilot operator token, retrieved privately as described in [the storage guide](UBUNTU_STORAGE_PILOT.md).

The Vite dev and preview servers forward `/api` to `127.0.0.1:8091`. The token stays in component memory, is not placed in URLs or browser storage, and is cleared on disconnect/navigation/reload. This remains shared pilot operator access, not individual user login. Do not expose the Vite server publicly. A deployed static frontend needs an equivalent private reverse proxy or another authenticated backend access design.

The page retrieves real campus inventory, registered devices and the latest 100 observations. It refreshes every 30 seconds while open. Tests are hidden by default and explicitly labelled when enabled. No observation is shown as a zero count when processing failed. No totals are calculated by adding repeated frames/trap totals. The original Overview and Sites & Map pages retain their labelled demo records and existing imagery.

## Device provisioning when hardware is available

Through the operator-authorized API docs:

1. `GET /campuses` and `GET /campuses/{id}` identify KBTCOE and its area IDs.
2. `POST /lunchbox/devices` with `campus_id`, `label`, and `is_test:false` registers the physical device. The response returns its random credential **once**; only SHA-256 is stored on the server. Save it securely on that device. Do not put it in the frontend.
3. `POST /lunchbox/deployments` records `device_id`, optional `area_id`, latitude, longitude, `coordinate_quality` (`GPS` or `Approximate`) and timezone-qualified `starts_at`. Use actual installation coordinates. Only one open/non-overlapping deployment per device is accepted.
4. Configure the device's deployment ID, API URL, device credential and outbox directory.
5. When moving it, close the existing deployment using `/lunchbox/deployments/{id}/close` and create a new deployment. Retain historical records.
6. To retire or lose a credential, use `/lunchbox/devices/{id}/revoke`; register a replacement credential/device as appropriate. Revocation prevents uploads, including retries, while retaining history.

The API remains loopback-only on Ubuntu. **Direct device access through the Tailscale IP is not exposed.** At deployment, provision a dedicated SSH tunnel on the device or an authenticated HTTPS endpoint restricted to the intended network. The device's network access and service supervision are hardware deployment steps, not configured by this server pilot. Never reuse this Windows user's private SSH key on a device.

Device credentials can submit observations and their own evidence, but cannot read operator APIs, create devices, change deployments or upload for another device. Operator credentials cannot impersonate device ingestion. Real per-user officer authorization remains future work.

## Observation contract — version 1

Send JSON to `POST /lunchbox/observations`, with `Authorization: Bearer DEVICE_TOKEN`:

```json
{
  "event_id": "dc8580c3-a2a2-4cbd-bcba-747b2c695f73",
  "deployment_id": "REPLACE_WITH_ASSIGNED_DEPLOYMENT_UUID",
  "observed_at": "2026-10-21T10:01:00+05:30",
  "interval_start": "2026-10-21T10:00:00+05:30",
  "interval_end": "2026-10-21T10:01:00+05:30",
  "count_basis": "frame_count",
  "processing_status": "ok",
  "mosquito_count": 3,
  "species_counts": [
    { "label": "unknown", "count": 3, "confidence": null }
  ],
  "model_name": "REPLACE_WITH_MODEL_NAME",
  "model_version": "REPLACE_WITH_MODEL_VERSION",
  "evidence_sha256": null
}
```

This example is illustrative, not a college observation. Replace IDs/timestamps/model metadata with actual values. Valid count bases:

| Basis | Meaning |
| --- | --- |
| `frame_count` | Mosquitoes counted in this image/frame; not necessarily new individuals |
| `interval_new` | Newly detected individuals during this interval, only if the device actually implements tracking/deduplication |
| `trap_total` | Total currently observed in the trap; repeated totals are not additive |

Counts must be nonnegative integers, not booleans. Species counts must sum to the mosquito count; use `unknown` for unresolved individuals. Labels must be unique, at most 100 per event. Each optional confidence is between 0 and 1 and is a supplied model score, not a calibrated accuracy claim. The supported taxonomy and interpretation of per-class summary confidence must be agreed with the final model before real deployment; the server currently preserves supplied labels without claiming a validated classifier.

`capture_failed` or `inference_failed` events have `mosquito_count:null` and an empty species list, distinguishing failure from a valid zero. Timestamps require offsets; the observation time must fall within its interval, the entire interval must fall within the deployment, and the interval cannot be more than five minutes in the future. Delayed uploads for a closed deployment are accepted when their original interval fits that deployment. The server records a separate `received_at` in UTC.

Generate a UUID once when capturing an event. Store the original payload locally before sending. Reuse that exact event ID/payload on retry. The server returns 201 on first acceptance and 200 with `duplicate:true` on a retry. Reusing an ID with changed content returns 409 and never silently overwrites evidence. Unreviewed observations and audit events are immutable through this API.

## Optional evidence images and acknowledgements

If retaining an image, compute its lowercase SHA-256 and include it in the observation before first submission. Then:

1. Metadata acceptance returns the server observation `id`, `accepted:true`, `complete:false`, `image_status:pending`.
2. Send the raw JPEG/PNG bytes to `PUT /lunchbox/observations/{id}/image` using the same device credential.
3. The server validates format, dimensions, 25 MiB size limit and declared checksum, then returns `complete:true`.
4. Both metadata and image requests can be retried. The device must retain its local evidence until complete acknowledgement. Subsequent identical uploads do not create another image file or audit event.

If no evidence is declared, metadata acceptance returns `complete:true`, `image_status:not_requested`. Each observation currently supports one optional image. Crop sets, video, multiple images and independent calibration evidence require an explicit extension rather than overloading this field.

## Reference device outbox

`tools/lunchbox_outbox.py` is a Python standard-library reference client, not deployed firmware. It durably stores payloads and optional image bytes in SQLite, retries pending events, and marks them sent only after complete acknowledgement. Keep one outbox per physical device. Acknowledged rows are retained; storage retention/compaction and an automatic retry scheduler must be configured on the final device. Network failures and server rejections remain queued for retry/investigation; a conflicting event is never assigned a new ID automatically.

```sh
export LUNCHBOX_API_URL=http://127.0.0.1:8091
export LUNCHBOX_TOKEN=YOUR_DEVICE_CREDENTIAL
export LUNCHBOX_OUTBOX=/path/to/persistent/device-outbox.sqlite3
python3 tools/lunchbox_outbox.py enqueue event.json --image capture.png
python3 tools/lunchbox_outbox.py flush
```

Load the credential from a protected device configuration in actual deployment. The reference client accepts HTTPS or a loopback HTTP tunnel and refuses plaintext remote URLs. These instructions do not install a tunnel, AI model or device service.

## Reads, migrations and recovery

Operator APIs: `/lunchbox/devices`, `/lunchbox/deployments`, `/lunchbox/observations` take `campus_id` and optional `include_test=true`. Observations support a maximum `limit=500`; default is 100. For older records pass both `before` and `before_id` from the last row of the previous descending `(observed_at,id)` page. Images are available through operator-authenticated `/lunchbox/observations/{id}/image`. Responses never include device token hashes.

`backend/migrations/002_campus_lunchbox.sql` is additive and repeatable; apply with `python3 migrate.py` from the server deployment directory. New installations run the base schema then migrations. Existing installations must apply migrations explicitly before deploying code that requires them.

Run `python3 lunchbox-smoke.py` to create explicitly simulated devices/events, exercise ingestion, and revoke those test credentials at the end. `--verify-only` reads the retained validation record without creating data. The check exercises concurrent retries, wrong-device access, changed-payload conflicts, invalid counts/timestamps, evidence checksums/retries, legitimate zero vs failure, deployment history, revoked credentials and a durable device queue recovering from an unavailable endpoint. Browser checks cover access errors, test isolation, mobile layout and token clearing.

The existing coordinated backup includes these new database tables, hashed device credentials and uploaded LunchBox images. Isolated restore validation checks both the initial storage evidence and the LunchBox image. The original drone asset registry contains references to existing source directories: **the evidence archive does not back up those original survey files**. They need a separate source-imagery backup. Scheduled/off-server backups, disk alerts, user accounts and operational review are still pending.

Implementation references: [PostgreSQL INSERT and conflict handling](https://www.postgresql.org/docs/17/sql-insert.html), [Pydantic strict and timezone-aware types](https://github.com/pydantic/pydantic/blob/main/docs/api/standard_library_types.md).

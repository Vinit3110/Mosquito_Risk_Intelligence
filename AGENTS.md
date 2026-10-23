# Repository working instructions

These instructions apply throughout this repository unless a more specific `AGENTS.md` applies. Follow the user's current task and preserve unrelated work. This file describes how to contribute; [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) describes what the project currently is.

## Start here

1. Read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md), then the specialist document for the area you will change. Use its documentation map instead of treating every historical report as current instructions.
2. Run `git status --short` and inspect relevant existing changes. The working tree may contain ongoing map, data or documentation work from another chat. Re-read a file immediately before editing it if it has changed during your task.
3. Inspect the implementation, data contract and relevant tests before proposing changes. A roadmap, type definition, disabled button or dataset export is not proof of an operational capability.
4. Keep the change within the requested scope. Record newly discovered gaps without silently adding deployments, dataset rebuilds, training, dependency upgrades or unrelated refactors.
5. When reporting completion, distinguish checks you actually ran from previously recorded results. Give the commands, outcome and relevant limits; do not copy historical pass counts as fresh results.

## Repository map

| Area | Primary locations | Read before changing |
| --- | --- | --- |
| App shell, routing, overview | `frontend/src/App.tsx`, `frontend/src/main.tsx`, `frontend/src/components/AppShell.tsx`, `frontend/src/pages/OverviewPage.tsx` | [README](README.md), [project context](PROJECT_CONTEXT.md) |
| Active map workspace | `frontend/src/pages/SitesPage.tsx`, `frontend/src/components/GoogleSurveillanceMap.tsx`, `frontend/src/components/LayersPanel.tsx` | [map setup](docs/GOOGLE_MAPS_SETUP.md), [GIS contracts](docs/GEOSPATIAL_INTEGRATION.md) |
| Data validation and map adapters | `frontend/src/geospatial/` | [GIS contracts](docs/GEOSPATIAL_INTEGRATION.md), [wards](docs/WARD_BOUNDARIES.md), [drone tiles](docs/DRONE_MAP.md) |
| Demo surveillance records | `frontend/src/data/demoData.ts`, `frontend/src/domain.ts`, site list/detail components | Evidence and identity rules below |
| LunchBox frontend/API/outbox | `frontend/src/pages/LunchBoxPage.tsx`, `backend/lunchbox.py`, `tools/lunchbox_outbox.py` | [LunchBox contract](docs/LUNCHBOX_INTEGRATION.md) |
| Persistent storage and deployment | `backend/`, `deploy/ubuntu/` | [storage operations](docs/UBUNTU_STORAGE_PILOT.md) |
| Drone source and annotation workspace | `Drone_First_Flight/` (local, Git-ignored) | Its [README](Drone_First_Flight/README.md), [layout pointers](Drone_First_Flight/project_layout.json), frozen rules and current release report |
| Browser and adapter checks | `frontend/tests/`, both Playwright configs in `frontend/` | Validation section below |

Frontend source, assets, tests, npm manifests and tool configuration live under `frontend/`. Run npm commands there; shared `tools/` and deployment commands retain the repository root as their base unless documented otherwise. Browser asset URLs are unchanged.

## Implementation conventions

- Use the existing React function components, TypeScript types, React Router and CSS files. Match the surrounding style; avoid repository-wide formatting changes.
- TypeScript is strict. Define explicit contracts at boundaries, receive external JSON as `unknown`, validate it, and avoid introducing `any` into active code. Legacy renderer exceptions are not a convention for new code.
- Keep loading/validation in `frontend/src/geospatial/`, vendor-specific rendering in the Google adapters, and UI state in the page/components. Heavy GIS processing belongs in offline Python tooling or a future processing service.
- The active renderer is Google Maps. `DemoMap.tsx`, `NashikMap.tsx`, `NashikMapGL.tsx` and `styles-mapgl.css` are retained legacy material. Do not activate them as a fallback or remove their dependencies as an incidental cleanup.
- Preserve accessible labels, keyboard/list access, visible selection, useful loading/empty/error states and mobile layouts. Site selection uses the `site` URL parameter. Ward and survey selection are separate from site selection and layer visibility.
- Clean up map listeners, overlays, timers and fetches on dependency changes/unmount. Preserve independent area visibility and master-toggle state.
- Preserve the existing explicit missing-key, authentication, timeout and metadata-failure behavior. Do not replace missing data with plausible-looking maps, polygons, imagery, dates or observations.
- `frontend/public/` is browser-served content and is copied into builds. Keep raw captures, private evidence, operator credentials and device credentials out of it.
- Use the lockfiles when changing dependencies. `frontend/package-lock.json` governs npm installs; the backend Dockerfile installs `backend/requirements.lock.txt`. Do not update either lockfile for unrelated documentation work.

## Evidence and identity rules

- Overview and Sites & Map currently use six labelled demo site records. Their `Verified` statuses, counts, confidence values, coordinates and activity are illustrative. Preserve that distinction when introducing real data.
- Aerial environmental classes, trap mosquito/species predictions and human field verification are different evidence sources. A visible water surface, tank or debris label does not establish mosquito breeding, species or disease risk.
- Keep `Site`, `Survey`, survey asset, physical feature, device, deployment and observation identities separate. Repeated views or repeat surveys do not create new physical features automatically.
- Preserve original evidence, provenance, dates, coordinate quality, reviewer decisions and quality holds. Do not make a failed measurement appear as zero, an absent record appear as a negative finding, or a model confidence appear as validated accuracy.
- The frontend status union, backend's current `Potential`-only site status and the roadmap's proposed lifecycle differ. Agree and migrate a canonical contract before implementing operational transitions; do not silently equate them.
- Distinguish date-only capture metadata from timezone-aware event timestamps. The first-flight capture date is 19 August 2026; its exact capture timezone is unspecified. Do not invent a UTC capture time.

## Geospatial changes

- Browser positions use WGS84 degrees; GeoJSON uses **longitude, latitude**. Source orthophotos use EPSG:32643. Display XYZ tiles use Web Mercator. Transform coordinates; do not relabel projected numbers as geographic coordinates.
- Preserve source geometry/properties when normalizing IDs and names. The active boundary dataset is `frontend/public/data/nashik_wards.geojson`, containing 31 owner-approved wards. Historical Ward 7 inputs are in `geojson/` and `kml/`.
- Owner approval, geometry validity, municipal authority and independently measured positional accuracy are distinct claims. Retain the provenance described in [WARD_BOUNDARIES.md](docs/WARD_BOUNDARIES.md).
- Survey metadata requires unique IDs, valid dates, supported CRS and bounds/imagery for `ready` entries. Preserve transparent nodata, coverage limits, tile zoom limits and loading failures. Do not clip survey coverage to wards without an explicit requirement and provenance.
- Use `VITE_WARDS_GEOJSON_URL` and `VITE_SURVEYS_METADATA_URL` for existing override seams. Bundled assets must respect Vite's base path.
- `tools/prepare_drone_tiles.py` expects `Area_A` through `Area_D` beneath its input directory. With the reorganized workspace, pass `--input Drone_First_Flight/data/photogrammetry`; its default input path is historical.
- Tile generation writes output files. For a new processing run, use a fresh output directory, inspect metadata/alpha/coverage, and publish matching metadata and tiles together. It is not a routine verification command.

## Drone datasets and review artifacts

Start with [project_layout.json](Drone_First_Flight/project_layout.json). `current_dataset` identifies the orthophoto release; `current_raw_detection_annotation_candidate` identifies the newer raw-frame detection candidate. These are different artifacts.

- Preserve raw DNGs, photogrammetry products and original metadata. Use faithful, reproducible derivatives for scientific review; never synthesize missing source evidence.
- Apply the frozen five-class [annotation rules](Drone_First_Flight/docs/taxonomy/annotation_rules_v1/Annotation_Rules_v1.md) and [class schema](Drone_First_Flight/docs/taxonomy/annotation_rules_v1/class_schema_v1.json). Definition changes need an explicit version and affected-label review. Unknown/ignore regions are not an extra target class.
- Read the latest adjudication overlay before using historical candidate labels. Current raw identity decisions are in `reviews/raw_adjudication_v3/` under the drone workspace. Preserve both original proposals and later corrections.
- Identity acceptance, boundary acceptance, image quality, reviewed coverage, export eligibility and training authorization are separate fields/decisions. Do not clear a quality restriction merely because a class identity was accepted.
- Sparse unmarked pixels remain unknown. The detection candidate's reviewed-background permission applies only to its exact eligible tiles and recorded review status, not entire raw frames or older sparse crops.
- Keep water and structure as separate overlapping labels. Preserve polygon holes, disconnected visible components, masks, native/tile transforms and source references.
- Keep repeated physical features, overlapping scenes and all raw/orthophoto/crop/augmented derivatives in the same split. Preserve `AC_shared_construction`, `B_site` and `D_site`; do not randomly split tiles.
- Earlier release folders contain shared assets used by later releases. Do not delete them or copy only the latest folder and call it a standalone dataset.
- Build/finalize/seal scripts can overwrite artifacts, and some `verify_*.py` scripts also write reports, manifests or inventory state. Read their implementation before running them. A filename containing `verify` does not establish read-only behavior.
- Dataset review and model training must stay within the user's authorized task. The current candidate records `human_dataset_approved:false`, `training_authorized:false` and `training_performed:false`; this documentation does not change those decisions.

## Backend, credentials and operations

- Keep `frontend/.env.local`, server `.env`, tokens and SSH keys private. Do not print values, put them in examples/logs/screenshots, or commit them. `VITE_*` values are embedded in browser assets and cannot hold server/device secrets.
- The LunchBox operator token stays in page memory and is cleared when leaving/disconnecting. Preserve its exclusion from URLs, local storage and session storage.
- Preserve separation of operator and device permissions. Device credentials are returned once and stored as hashes server-side. Device ingestion must not gain operator read/provisioning access.
- Preserve observation idempotency: the same device/event ID and payload reuses a record; changed content conflicts. Retain image checksums and complete acknowledgement before marking an outbox event sent.
- Preserve `is_test`, unreviewed status, count basis, deployment history and event/received times. Failed capture/inference has a null count. Repeated `frame_count` or `trap_total` values are not additive totals.
- Keep migrations additive and repeatable. Editing `schema.sql` does not migrate an existing database. The current API role has deliberately limited privileges.
- The Ubuntu pilot is separate from WebODM, with API access bound to loopback. Do not modify WebODM containers, expose pilot ports publicly or treat a local frontend build as a production deployment.
- Deployment, migration, registration, smoke creation and backup scripts change server state. Run them only when relevant to the authorized task. `backup.sh` briefly stops the pilot API; normal smoke runs create simulated records. The documented `--verify-only` modes inspect retained records.
- Existing coordinated backups cover the database and uploaded evidence, not the original drone asset directories referenced by the registry. Keep source-imagery backup requirements explicit.

## Validation appropriate to the change

| Change | Checks |
| --- | --- |
| Documentation only | Verify linked local paths, commands against configuration, current facts against source/manifests, and `git diff --check`. Application tests are unnecessary unless behavior also changes. |
| Frontend behavior/types/styles | `npm run typecheck`, `npm run lint`, `npm run build`, relevant Playwright checks; use the full regression suite for shared behavior. Inspect desktop/mobile output for visual changes. |
| Map adapters, metadata, wards or tiles | Relevant `geospatial`, `ward7`, `drone`, `workspace` and error tests. Live Google checks only when actual provider rendering needs verification. |
| Backend/schema/outbox | Validate Python syntax and relevant contracts; use an appropriate isolated database/API environment for integration checks. Frontend Playwright tests do not validate real backend persistence. |
| Annotation/source layout | Read the drone tooling guide and relevant verifier first. Check provenance, masks/geometry, counts, links and hashes appropriate to the changed release. Preserve historical artifacts. |

From the repository root, enter `frontend/` before running standard frontend commands:

```sh
cd frontend
npm ci
npm run dev
npm run typecheck
npm run lint
npm run build
npm test
```

Use `npm ci` when dependencies need installation, not on every task. If the browser runtime is missing, install it with `npx playwright install chromium`.

- The normal suite uses isolated Vite ports **5187/5188**, blank/invalid map keys and intercepted Google failure requests. LunchBox responses are mocked. No real backend or paid Google map calls are required.
- The normal servers use modes `test-no-key` and `test-invalid-key`; Vite keeps a separate dependency cache per mode to prevent concurrent Windows cache renames.
- `npm test -- --config playwright.live.config.ts` uses port **5189**, the existing local Google configuration and live Google requests. It is separate from normal regression tests.
- From the repository root, `node tools/check-lunchbox-live.mjs` reads the operator credential through SSH and opens a real backend connection using ports **8091/5190**. It is a separate live check, not part of `npm test`.
- Drone `tooling/Verify-Workspace.ps1` runs from the drone workspace, requires compatible Python 3.12 for bundled dataset dependencies, and writes audit reports while suppressing selected release writes. Its older verifier selection does not establish coverage of every newer detection export. See [tooling instructions](Drone_First_Flight/tooling/README.md).
- Do not introduce tests that merely restate documentation or mirror a trivial edit. Prefer existing checks that exercise the changed behavior.

## Keep the documentation current

Update [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) when architecture, current datasets, implemented scope or next milestones change. Update the relevant specialist guide and roadmap in the same change. Update this file when working conventions or validation commands change.

Date factual snapshots and executed checks. Preserve historical reports with clear historical labels; do not erase their original conclusions or silently reinterpret old test results. Keep secrets and machine-specific credentials out of all documentation. Link to detailed sources instead of duplicating entire contracts into several files.

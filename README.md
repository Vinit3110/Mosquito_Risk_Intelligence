# Mosquito Risk Intelligence — Google Maps workspace

React 19 / TypeScript / Vite frontend for municipal mosquito surveillance, with a private FastAPI/PostgreSQL/PostGIS pilot. Routes: Overview `/`, Sites & Map `/sites`, and KBTCOE · LunchBox `/lunchbox`.

Start with [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for current architecture, real/demo data, the local drone annotation workspace and remaining work. Read [AGENTS.md](AGENTS.md) before contributing for working conventions, evidence rules and validation commands. Specialist guides are in `docs/`; the [repository review](docs/REPOSITORY_REVIEW_2026-10-22.md) records the scope of the October 22 documentation reconciliation.
For the complete target workflow, current position against the system diagrams, remaining milestones and progress tracker, see [End-to-end system roadmap and status](docs/SYSTEM_ROADMAP_AND_STATUS.md).

A private PostgreSQL/PostGIS and evidence-storage pilot is available on the Ubuntu server. The **KBTCOE · LunchBox** page at `/lunchbox` now reads the registered college survey and LunchBox observations through that backend. See [KBTCOE and LunchBox setup](docs/LUNCHBOX_INTEGRATION.md) and [storage operations](docs/UBUNTU_STORAGE_PILOT.md). Overview and Sites & Map retain their labelled demo surveillance records.

The map-first workspace uses the official Google Maps JavaScript loader, starts in Nashik, and keeps the existing six clearly labeled demo records. It includes local site/location/ward search, URL-backed selection, site details, filters, a collapsible site list, and independent map-layer controls.

## Repository layout

- `frontend/`: React source, public map assets, browser tests, npm manifests, Vite/TypeScript/ESLint/Playwright configuration, and private local environment configuration.
- `backend/`: FastAPI, SQL schemas/migrations, and backend dependency specifications.
- `deploy/`: Ubuntu pilot deployment and operations scripts.
- `tools/`: shared offline processing and explicit live-check tools; run their documented commands from the repository root.
- `docs/`: specialist guides, roadmap, and dated historical records.
- `Drone_First_Flight/`: local Git-ignored research workspace; original imagery, datasets, and reviews.
- `geojson/`, `kml/`: retained historical GIS inputs.

## Run

Run frontend npm commands from `frontend/`. From the repository root:

```bash
cd frontend
npm ci
```

If `.env.local` does not already exist, copy `.env.example` to it. Configure `VITE_GOOGLE_MAPS_API_KEY` privately, then:

```bash
npm run dev
```

A missing key shows an explicit configuration state. It never draws a fake or substitute map. A production JavaScript map ID is also recommended; `DEMO_MAP_ID` is the development default.

See [Google Cloud and environment setup](docs/GOOGLE_MAPS_SETUP.md).

## Layers and data

- Streets/Satellite select the actual Google map type when configured.
- Drone demo hotspots use circles; field sites use diamonds, colored by demo priority.
- The map's LunchBox location collection is empty. The separate `/lunchbox` page reads the private backend; real device deployment remains pending in the recorded pilot.
- Ward boundaries default to **all 31 Nashik wards**, visible on the map and approved for project use by the owner. Numbered searches select the exact ward. An optional URL overrides the collection. See [ward boundaries and NMC PDF reference](docs/WARD_BOUNDARIES.md).
- **Drone Map overlay** displays real first-flight orthophotos for Areas A–D above Streets or Satellite, with a master toggle, independent area controls, opacity and zoom-to-survey. The basemap remains visible outside survey coverage.
- Real survey metadata supports small browser ground images and production XYZ tiles through separate overlay adapters.
- Demo statuses, confidence and observations are illustrative, including entries labeled Verified. No mosquito species classification or last-updated timestamp has been supplied.
- Map search is local; arbitrary address lookup is not configured. `/lunchbox` has a private operator-token backend connection; individual user authentication and field workflows are not implemented.

The old demo, MapLibre and Leaflet renderers and MapLibre dependencies remain as legacy code. Live Google checks have been recorded; removing the legacy code is a separate cleanup task. The active page loads Google Maps.

See [GIS contracts, processing pipeline and exact required inputs](docs/GEOSPATIAL_INTEGRATION.md) and [audit/checkpoints](docs/IMPLEMENTATION_CHECKPOINTS.md).

## Validation

Run these commands from `frontend/`:

```bash
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
npm test
```

Tests use isolated Vite servers on ports 5187 and 5188. One has no API key; the other uses a clearly invalid test value and aborts Google network requests to exercise loader failure. Test-only synthetic geometry is never used as official ward data. No credentials or paid Google requests are required for this suite.

Frontend reorganization verified on **22 October 2026**: typecheck, lint, build and all **28 normal regression tests** passed from `frontend/`. The two regression servers use separate modes/dependency caches to avoid a Windows cache collision found during the move. See the [reorganization checkpoint](docs/IMPLEMENTATION_CHECKPOINTS.md#frontend-directory-reorganization--22-october-2026) for validation scope.

Latest recorded implementation checkpoint: the October 22 ward integration reports **28 regression tests and a passing build**, followed by passing targeted ward checks after a numeric-alias adjustment. Earlier imagery/LunchBox checkpoints recorded 25 and 26 frontend tests respectively. These counts describe those revisions, not tests rerun for the documentation reconciliation or a fixed future suite size. Browser checks cover missing/loading/error states, filters, search, selection, layers, actual drone tiles/metadata, supplied/invalid metadata, LunchBox access/test isolation and desktop/mobile layouts. GIS adapter tests cover validation, tile coverage, geometry forwarding, ward bounds fitting, selection and cleanup.

A separate live suite uses the existing `.env.local` key on isolated port 5189: `npm test -- --config playwright.live.config.ts`. The October 22 checkpoint records **2 live tests passing**, covering the replacement 31-ward collection and real orthophotos, with the settled Ward 7 screenshot inspected. Live display checks do not establish survey positional accuracy or official municipal delimitation. See [Drone Map processing and usage](docs/DRONE_MAP.md), [ward provenance](docs/WARD_BOUNDARIES.md) and dated [implementation checkpoints](docs/IMPLEMENTATION_CHECKPOINTS.md).

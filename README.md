# Mosquito Risk Intelligence — Google Maps workspace

React 19 / TypeScript / Vite frontend for municipal mosquito surveillance. Routes: Overview `/` and Sites & Map `/sites`.

For any issues refer to docs folder inside this project.
For the complete target workflow, current position against the system diagrams, remaining milestones and progress tracker, see [End-to-end system roadmap and status](docs/SYSTEM_ROADMAP_AND_STATUS.md).

A private PostgreSQL/PostGIS and evidence-storage pilot is available on the Ubuntu server. The **KBTCOE · LunchBox** page at `/lunchbox` now reads the registered college survey and LunchBox observations through that backend. See [KBTCOE and LunchBox setup](docs/LUNCHBOX_INTEGRATION.md) and [storage operations](docs/UBUNTU_STORAGE_PILOT.md). Overview and Sites & Map retain their labelled demo surveillance records.

The map-first workspace uses the official Google Maps JavaScript loader, starts in Nashik, and keeps the existing six clearly labeled demo records. It includes local site/location/ward search, URL-backed selection, site details, filters, a collapsible site list, and independent map-layer controls.

## Run

```bash
npm install
```

Copy `.env.example` to `.env.local`, set `VITE_GOOGLE_MAPS_API_KEY`, then:

```bash
npm run dev
```

A missing key shows an explicit configuration state. It never draws a fake or substitute map. A production JavaScript map ID is also recommended; `DEMO_MAP_ID` is the development default.

See [Google Cloud and environment setup](docs/GOOGLE_MAPS_SETUP.md).

## Layers and data

- Streets/Satellite select the actual Google map type when configured.
- Drone demo hotspots use circles; field sites use diamonds, colored by demo priority.
- LunchBoxes have no locations supplied.
- Ward boundaries default to the supplied **Ward No.7 only**, manually traced and not municipally verified. An optional URL overrides the collection; source `ward_id`/`ward_name` are normalized without changing geometry.
- **Drone Map overlay** displays real first-flight orthophotos for Areas A–D above Streets or Satellite, with a master toggle, independent area controls, opacity and zoom-to-survey. The basemap remains visible outside survey coverage.
- Real survey metadata supports small browser ground images and production XYZ tiles through separate overlay adapters.
- Demo statuses, confidence and observations are illustrative, including entries labeled Verified. No mosquito species classification or last-updated timestamp has been supplied.
- Map search is local; arbitrary address lookup is not configured. `/lunchbox` has a private operator-token backend connection; individual user authentication and field workflows are not implemented.

The old MapLibre and Leaflet components and MapLibre dependencies are retained until a live Google map is verified. They are not loaded by the new page.

See [GIS contracts, processing pipeline and exact required inputs](docs/GEOSPATIAL_INTEGRATION.md) and [audit/checkpoints](docs/IMPLEMENTATION_CHECKPOINTS.md).

## Validation

```bash
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
npm test
```

Tests use isolated Vite servers on ports 5187 and 5188. One has no API key; the other uses a clearly invalid test value and aborts Google network requests to exercise loader failure. Test-only synthetic geometry is never used as official ward data. No credentials or paid Google requests are required for this suite.

Latest executed result: lint, type-check and build pass; all 25 regression tests pass. Browser checks cover missing/loading/error states, filters, search, selection, layers, actual drone tiles/metadata, supplied/invalid metadata and 1440px/390px layouts. GIS adapter tests cover validation, tile coverage, geometry forwarding, ward bounds fitting, selection and cleanup.

A separate live suite uses the existing `.env.local` key on isolated port 5189: `npm test -- --config playwright.live.config.ts`. Both live tests passed, verifying the supplied ward and real orthophoto display, tiles from all four areas, hide/show, opacity and Streets/Satellite. Screenshots were inspected. This does not establish survey positional accuracy or official municipal delimitation. See [Drone Map processing and usage](docs/DRONE_MAP.md).

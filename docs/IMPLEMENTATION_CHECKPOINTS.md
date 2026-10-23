# Migration audit and checkpoints

> Path update — 22 October 2026: frontend source, public assets, tests, npm manifests, tool configuration and generated frontend folders now live under `frontend/`. Earlier paths and commands below describe their dated checkpoints; run current npm commands from `frontend/`. See [project context](../PROJECT_CONTEXT.md) for current locations.

> Historical record: each section describes its own implementation checkpoint. Statements such as "no backend", "no Git repository", missing imagery/wards and the initial active MapLibre renderer describe earlier revisions. For current architecture and data, start with [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md), [the current roadmap](SYSTEM_ROADMAP_AND_STATUS.md) and [ward boundaries](WARD_BOUNDARIES.md). Preserve dated test results as historical evidence.

## 1. Existing state

- React 19, React Router 7, Vite 6, TypeScript 5.7; npm lockfile; no Git repository in this directory.
- Routes: Overview `/`, Sites & Map `/sites`, unknown routes redirect to Overview.
- Active map: `NashikMapGL.tsx`, using react-map-gl/MapLibre and OpenFreeMap. Older CDN Leaflet `NashikMap.tsx` and a demo canvas remain in source.
- Six explicitly labeled demo sites with geographic Nashik coordinates; priority/status/evidence and approximate demo-area labels. No backend, environment files, LunchBox locations, official wards or orthophotos.
- Existing search/status/priority/area filters, collapsible list, URL selection and detail card were reusable.
- Baseline `npm run build` failed on optional coordinates, missing Vite worker declarations, and handwritten vendor type shims. Initially no lint, standalone type-check or browser-test commands existed.
- No dispatch reference image is available in this folder/chat. The implementation follows the requested map-first layout and existing municipal visual style.

Smallest migration: retain legacy renderers/dependencies; add official Google loader and proper types; connect a vendor-neutral marker/layer interface to the existing page; leave Overview and routing intact. Remove the legacy renderer only after live Google verification.

## 2. Google integration

Official loader installed; typed reusable renderer defaults to Nashik 19.9975, 73.7898, zoom 12. Build/type-check passed after baseline type fixes. No key present: real rendering, pan, zoom and imagery cannot be confirmed. The missing-key state is explicit and does not draw a substitute map.

## 3–5. Workspace, selection and layers

Map occupies the primary workspace. Search offers local destinations, site matches and supplied wards. URL-backed site selection controls marker emphasis, list and detail card. Distinct field-site/hotspot symbols, compact legend, floating controls and collapsible list. Existing filters are retained. Layers include real roadmap/satellite API switching, hotspot visibility, empty LunchBoxes/wards and four awaiting-data surveys dated 19 Aug 2026. Survey selection is separate from its visibility checkbox.

## 6–8. GIS and architecture

Typed survey/ward/LunchBox/intervention contracts stay independent of Google. Optional metadata URLs load/validate data. Google adapters accept browser ground imagery, bounded XYZ tiles and supplied polygon geometry. UTM input coordinates are rejected at frontend boundaries; GIS transformation is documented for an external processing job. No imagery or ward polygons were fabricated. See `GEOSPATIAL_INTEGRATION.md`.

## 9. Validation

Executed: `npm run typecheck` passed; `npm run lint` passed; `npm run build` passed; `npm test` passed all 15 tests. Browser screenshots at 1440px and 390px were visually inspected. The first browser run found unclear filter labels and a mobile list-toggle placement issue; both were corrected before the passing run. Browser tests use isolated ports 5187/5188 to avoid the existing development server.

Adapter tests use test doubles to verify geometry forwarding/selection, overlay cleanup and tile rules; these are not evidence of a successful live Google map. Browser checks cover credential-free UI behavior, filtering, selection, layers, supplied/invalid metadata and responsive widths. Loader failure is tested by aborting the real loader's network request, not by displaying a fake map. Live Google checks require the configured key and actual imagery/geometry.

## 10. Remaining external inputs

Valid restricted Google browser key; production JavaScript map ID; authoritative ward GeoJSON; actual LunchBox data; backend site feeds; original or processed WebODM imagery and metadata. Full cloud setup and exact next-iteration inputs are documented separately.

## Changed-file inventory

- Page/UI: `src/pages/SitesPage.tsx`, new `src/components/GoogleSurveillanceMap.tsx`, new `src/components/LayersPanel.tsx`, `src/components/SiteDetail.tsx`, `src/components/SiteList.tsx`, new `src/styles-google-map.css`.
- Domain/data seams: `src/domain.ts`; new `src/geospatial/types.ts`, `data.ts`, `validation.ts`, `useGeospatialData.ts`, `googleLoader.ts`, `googleOverlays.ts`, `googleWards.ts`.
- Baseline fixes: `src/components/NashikMap.tsx` guards optional coordinates; `src/components/NashikMapGL.tsx` removes unused imports/state setter; `src/types/vendor.d.ts` replaces handwritten vendor shims with the authentication callback declaration; new `src/vite-env.d.ts` enables Vite/worker imports. Neither legacy renderer was removed.
- Configuration/dependencies: `package.json`, `package-lock.json`; new `.env.example`, `.gitignore`, `eslint.config.js`, `playwright.config.ts`.
- Checks: new `tests/workspace.spec.ts`, `tests/geospatial.spec.ts`, `tests/errors-and-data.spec.ts`.
- Documentation: updated `README.md`; new `docs/GOOGLE_MAPS_SETUP.md`, `docs/GEOSPATIAL_INTEGRATION.md`, this checkpoint report.

Installed runtime dependency: `@googlemaps/js-api-loader` 2.1.3. Added development dependencies: Google Maps/GeoJSON/React/React DOM types, ESLint plus its recommended JavaScript config and TypeScript ESLint, and Playwright Test. No existing dependency was removed. Generated `dist/` and test screenshots are ignored build/test artifacts.

## Ward No.7 integration — 11 Oct 2026

The preceding sections record the original migration. This update adds the first supplied boundary and supersedes the earlier missing-ward/missing-key limitations for the Ward 7 display check only.

### Audit and smallest change

Read the three integration documents and inspected the current page, Google renderer, layer controls, types, data, validator, loader and ward adapter before editing. Supplied files were found at `D:/Users/Vinit/Downloads/ward_07.geojson` and `D:/Users/Vinit/Downloads/Ward_No_7.kml`. Compatibility gaps: the source uses numeric `ward_id` and `ward_name`, whereas the application expects string `id` and `name`; the loader previously required an explicit URL. Existing selection, bounds fitting and visibility cleanup were reusable.

### Data and behavior

- Copied the GeoJSON unchanged to `public/data/ward_07.geojson`. SHA256: `7E22D71C1257D92F816A437FEFD5A5257200EBF77FFF99635222A33589D17538`.
- One Polygon, one closed ring, 46 vertices; all coordinates are valid geographic ranges and the longitude/latitude sequence exactly matches the supplied KML. No coordinates were changed.
- Normalization at the existing validation boundary adds `id: "7"` and `name: "Ward No.7"` and retains `ward_id`, `ward_name`, `source_file`, `boundary_status`, and geometry. Canonical datasets remain supported; duplicate IDs and malformed rings are rejected.
- Empty/unset `VITE_WARDS_GEOJSON_URL` now loads the bundled asset using Vite's base path; a configured URL replaces it. Additional features use the same collection/loading/rendering path.
- Boundary styling uses a visible 2px outline and 8% fill unselected, and a dark 4px outline with 22% fill selected. Clicking the polygon or searching `Ward 7`, `Ward No.7`, or its identifier selects the same feature; the existing adapter fits bounds. Hide/show retains selection and restores styling.
- UI exposes source/status and loaded ward count. **Only Ward 7 is supplied. It is manually traced and has not been verified against authoritative municipal GIS data.** No mosquito observations, risk values, LunchBox locations, ward statistics or official site assignments were added.

### Executed verification

`npm run typecheck`, `npm run lint`, and `npm run build` passed. `npm test` passed **21 tests**, including six new tests for the supplied static asset, source-property normalization, future canonical/source schemas, invalid rings/coordinates, ward adapter styling/click/bounds/cleanup, search, visibility persistence, and loading/empty failures. Original workspace tests remain passing.

`npm test -- --config playwright.live.config.ts` passed **one separate live Google Maps test** using the existing local key on isolated port 5189. Confirmed map readiness, ward search/selection, layer hide/show and an actual polygon click. Live screenshots `test-results/ward7-live-visible.png`, `ward7-live-hidden.png`, and `ward7-live-restored.png` were inspected: the supplied outline/fill renders, disappears when disabled, and returns selected. Credentials were not changed or exposed. **Official geographic alignment and municipal delimitation were not validated**; display/interaction and KML equivalence do not establish authority.

### Files and remaining limitations

Added `public/data/ward_07.geojson`, `tests/ward7.spec.ts`, `tests/ward7-live.spec.ts`, and `playwright.live.config.ts`. Updated the existing validator, data helper, geospatial hook, ward adapter, SitesPage, two existing browser tests, main Playwright config (excludes the opt-in live test), `.env.example`, README and the three integration documents. No backend or dependency was added; no legacy renderer/dependency was removed. Actual LunchBox data, backend observations, orthophotos and authoritative ward validation remain pending.

## First-flight Drone Map integration — 12 Oct 2026

### Inputs and processing

Inspected all four supplied `Drone_First_Flight/Area_{A,B,C,D}` folders. Each includes an orthophoto GeoTIFF, report, DSM, LAZ, GLB and shots GeoJSON. Embedded orthophoto CRS is EPSG:32643; all contain UInt16 RGBA, with actual alpha 0/255. Capture dates were extracted from the reports as 19 August 2026, not inferred from file modification or processing dates. Report A's relevant first page was rendered and visually inspected in addition to text extraction from all four reports.

Executed the new offline `tools/prepare_drone_tiles.py` with existing GIS dependencies from Work_Vault (Rasterio 1.5.2 / GDAL 3.12.2). Sources were opened read-only. Bounds were densified and transformed into WGS84; imagery was reprojected to an aligned Web Mercator XYZ grid with preserved alpha. Generated **1,630 256px RGBA PNGs at zooms 14–22**, approximately **144.5 MiB**, plus real survey metadata and processing audit under `public/drone`. Native source pixels remain untouched; display tiles at zoom 22 have approximately 3.5cm ground resolution. No full-resolution GeoTIFF is loaded by the frontend.

### Workspace changes

Drone Map is a master overlay toggle alongside the Streets/Satellite base-map controls. Enabling it initially selects all ready areas and fits combined coverage. Areas are independently toggleable; master hide/show retains their choices. A 0–100% opacity slider and per-survey bounds fitting/Zoom to survey are implemented. The existing overlay adapter supplies only visible bounded tiles. Transparent margins and survey gaps reveal the basemap; no fake imagery, ward clipping or mosquito observations were added. Overlaps follow metadata order A → B → C → D, later areas on top.

The existing survey loader now defaults to `/drone/surveys.json`, respecting the Vite base path. `VITE_SURVEYS_METADATA_URL` remains a configurable override. Failed metadata requests show an error and empty data rather than substituting demo areas. The typed imagery contract and Google overlay rendering separation are retained.

### Executed validation

- `npm run typecheck`, `npm run lint`, `npm run build`: passed. The build contains all **1,630** PNGs and survey metadata in `dist/drone`.
- `npm test`: **25 passed**. Existing routes, filters, markers' selection UI, wards, error states and responsive layouts remain covered. New checks cover real XYZ metadata/union bounds, served RGBA tiles, master/per-area state, opacity, base-map persistence and missing metadata.
- `npm test -- --config playwright.live.config.ts`: **2 passed**, covering Ward 7 and the real drone imagery. Successful Google-map tile responses were observed for all four areas; Area B hide/show, opacity, Streets/Satellite and master removal were verified. No raw TIFF request occurred.
- All 1,630 generated PNGs were decoded for QA and checked for RGBA mode, 256×256 dimensions, expected file counts/sizes, and each area's 0/255 transparency extrema. Four-area imagery previews were inspected.
- Live screenshots `test-results/drone-live-streets.png`, `drone-live-satellite.png`, and `drone-live-hidden.png` were inspected: actual orthophotos appear over the chosen basemap, preserve transparent coverage, and disappear when disabled.

### Changed files and remaining limits

Added `tools/prepare_drone_tiles.py`, generated `public/drone` tiles/metadata/audit, `docs/DRONE_MAP.md`, `tests/drone.spec.ts` and `tests/drone-live.spec.ts`. Updated geospatial types/data/loading, Google map focus/overlay visibility, LayersPanel, SitesPage, scoped CSS, existing browser expectations, both Playwright configurations, `.gitignore`, `.env.example`, README and integration docs. No frontend package or backend was added, and no legacy renderer/dependency was removed.

Nothing further is required for this working overlay. GPS positional accuracy and alignment have not been independently verified against ground control; Ward 7 was still manually traced at this checkpoint (superseded by the 31-ward update below). Precise measurement and operational decisions require appropriate accuracy validation. Production hosting must include the public tile assets or point metadata to a suitable tile host. See `DRONE_MAP.md` for reprocessing, output provenance and delivery details.

## 31-ward boundary integration — 22 October 2026

This update supersedes earlier statements that only the manually traced Ward 7 is available. All 31 wards are now bundled at `public/data/nashik_wards.geojson`, using the owner-approved collection and the [NMC PDF boundary reference](WARD_BOUNDARIES.md). The owner explained that the earlier Ward 7 trace included the river. That KML and its original GeoJSON remain historical inputs; the old public Ward 7 asset was removed.

All 31 coordinate sets are unchanged. Only canonical string IDs/names and numeric feature ordering were added. Individual polygon validity, unique ward numbers 1–31, and production asset equality were checked. The dashboard shows the ward layer by default, uses neutral ward labels, and supports exact numbered searches, selection, bounds fitting, and hide/show with selection retained.

Validation:

- `npm test`: 28 passed, including searching and selecting each of the 31 wards.
- `npm run build`: passed; the built dataset matches the active collection and excludes the old public Ward 7 asset.
- Full live suite: 2 passed, covering ward interactions and drone imagery.
- After retaining numeric aliases for legacy custom collections, the 8 ward tests and the live ward test passed again; the production build passed again.
- The settled live Ward 7 screenshot was inspected with the basemap, selected outline, and neighbouring wards visible.

No frontend dependency or backend schema change was required. User verification against the referenced PDF is recorded separately from the structural and display checks performed during integration.

## Frontend directory reorganization — 22 October 2026

Moved frontend source, public assets, tests, npm manifests/lockfile, HTML entry, Vite/TypeScript/ESLint/Playwright configuration, local environment configuration and generated frontend folders into `frontend/`. Backend, deployment tools, shared tools, historical GIS inputs and the local drone workspace remain at the repository root. Existing uncommitted ward and documentation work was retained. The outer repository folder name is unchanged.

Updated the historical Ward 7 test reference, survey-manifest metadata reader, tile-output default and live LunchBox tool's frontend dependency/server/output paths. Updated current documentation and contribution instructions; historical records retain their former paths with a dated location note. Processing-audit source references remain repository-root-relative, and browser routes/static asset URLs remain unchanged. No datasets were rebuilt or server state changed.

The first normal browser run encountered a Windows `EPERM` dependency-cache rename collision between its two Vite servers (23 passed, 5 failed). Vite now separates caches by mode, with distinct `test-no-key` and `test-invalid-key` modes for those servers. The complete rerun passed.

Executed validation from `frontend/`:

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed; all 1,630 map tiles are present in `frontend/dist`.
- `npm test`: **28 passed**, including desktop/mobile workspace, ward selection, imagery controls, error states and mocked LunchBox checks.

Executed read-only validation from the repository root:

- `python tmp/verify_frontend_move.py`: all 1,630 tile blobs match Git; npm manifests and survey metadata/audit match after Git newline normalization; moved tracked files have destinations; 116 local Markdown targets resolve; all eight processing-audit source references resolve; changed Python tools parse without execution.
- `node --check tools/check-lunchbox-live.mjs`: passed; relocated Playwright/Vite dependency resolution was checked separately without opening SSH/API connections.
- `git check-ignore` confirms the relocated private environment, dependencies, build and test output remain ignored. No credentials were printed.
- `git diff --check`: passed.

Live Google Maps and Ubuntu/LunchBox integrations were not rerun. Their source paths were updated and normal local regression coverage passed; live availability/rendering and backend persistence were not revalidated by this move. Dependencies and lockfile contents were not upgraded.

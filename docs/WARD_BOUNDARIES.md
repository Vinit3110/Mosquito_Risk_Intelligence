# Nashik ward boundaries

## Current layer — 22 October 2026

The application bundles all **31 Nashik wards**, numbered 1–31, in `frontend/public/data/nashik_wards.geojson`. The project owner confirmed verification and approved this collection for project use on 22 October 2026.

Boundary reference: [NMC Nashik 2025 all-ward map PDF](https://nmc.gov.in/assets/admin/upload/download/nmcelection2025-26/NASHIK_2025_ALL_MAP_PDF.pdf).

This PDF is the project owner's stated map reference. The supplied vector collection was integrated directly; this integration did not extract coordinates from the PDF or independently certify municipal accuracy. The PDF URL could not be retrieved during integration, so PDF correspondence relies on the owner's verification.

## Data and behavior

- One Polygon feature per ward, using WGS84 longitude/latitude coordinates.
- Original `ward_no`, `city`, and all geometry coordinates are preserved. Features are ordered numerically; string `id` and `name` (`Ward No.1` through `Ward No.31`) provide the application contract.
- All 31 individual polygons passed geometry-validity checks. Ward IDs are unique; the application validates closed rings and geographic coordinate ranges. These checks do not establish a gap-free, overlap-free municipal partition.
- The ward layer is visible by default. Clicking a ward or searching its number selects it and fits the map to its bounds. Numbered searches are exact: `Ward 1` does not match Wards 10–19.
- Layer visibility can be toggled without losing the selected ward. The dashboard uses neutral ward names and the loaded count, without acquisition-site branding or source links.
- An empty `VITE_WARDS_GEOJSON_URL` loads the bundled collection, respecting the Vite base path. A configured URL replaces the collection through the existing loader.
- Ward boundaries do not create surveillance observations, population statistics, risk scores, or automatic site-to-ward assignments.

## Ward 7 replacement

The owner explained that the earlier manual Ward 7 trace included the river, accounting for the difference observed in the comparison. The active layer now uses Ward 7 from the approved 31-ward collection, without expanding its geometry to include that river area.

The previous manual trace remains at `kml/Ward_No_7.kml` and `geojson/ward_07.geojson` for historical comparison. It is not loaded by the dashboard or included as a public boundary asset.

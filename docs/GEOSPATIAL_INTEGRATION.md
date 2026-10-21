# Real geospatial inputs

The first-flight integration is now implemented: four real WebODM orthophotos have been reprojected and tiled at `public/drone`, with metadata loaded by the existing pipeline. See `DRONE_MAP.md` for the executed processing, controls, outputs and accuracy limits. The eventual pipeline design below remains applicable to future imagery.

The frontend contains no orthophoto processing server or existing backend. Keep all processing outside React:

`WebODM EPSG:32643 GeoTIFF → validate CRS/alpha/georeferencing → reproject and tile → own imagery endpoint → Google overlay adapter`

## Survey contract

`src/geospatial/types.ts` defines `SurveyLayer`, positions in WGS84 degrees, geographic bounds, LunchBox locations, ward geometry and intervention zones. The optional survey metadata URL returns an array. IDs must be unique. The date is ISO `YYYY-MM-DD`. Processing states are `awaiting-data`, `processing`, `ready`, and `error`. Ready entries require validated geographic bounds and imagery. Unknown imagery is never drawn.

Example schema (replace every placeholder with actual values, including transformed bounds):

```ts
const survey: SurveyLayer = {
  id: 'actual-survey-id',
  name: 'Actual survey name',
  date: '2026-08-19',
  sourceCrs: 'EPSG:32643',
  status: 'ready',
  bounds: { north: /* WGS84 */, south: /* WGS84 */, east: /* WGS84 */, west: /* WGS84 */ },
  imagery: {
    kind: 'xyz',
    urlTemplate: 'https://YOUR_HOST/surveys/actual-survey-id/{z}/{x}/{y}.png',
    minZoom: 12, maxZoom: 20, opacity: 0.75, tileSize: 256,
  },
};
```

For a small prototype, replace imagery with `{ kind: 'ground', url: '/actual-preview.png', opacity: 0.75 }`. This must be a browser-friendly, north-up, rectified WGS84 image with exact geographic bounds. A direct downsizing of a UTM image is not enough: warped edges and rotation cannot be represented correctly by a rectangular GroundOverlay. Use tiles for precise alignment and large imagery. GroundOverlay and XYZ adapter implementation live in `googleOverlays.ts` and are independent of UI controls.

The XYZ adapter uses Web Mercator tiles, top-origin y, geographic coverage checks, horizontal wrapping, 256-pixel tiles and min/max zoom. Google asks for visible tiles; the adapter does not fetch a full mosaic. Alpha and layer opacity preserve the basemap. Missing tiles are transparent and report a warning. Pending or failed survey processing creates no overlay. Current bounds support local non-antimeridian surveys, appropriate to Nashik.

## Processing and serving recommendation

Use GDAL in a separate batch job. First inspect `gdalinfo -json orthophoto.tif` for actual CRS, affine transform, dimensions, band types, nodata/alpha and footprint. Verify EPSG:32643 from the file rather than blindly assigning it. Transform a densified footprint to EPSG:4326 for metadata; transforming only two opposite corners can miss warped extremes. Reproject for a north-up EPSG:3857 raster with preserved alpha, then generate WebMercatorQuad XYZ tiles. Choose zooms from ground sampling distance and coverage, not the illustrative range above. Validate against known control points and check gaps, edges and positional accuracy.

Illustrative commands, **not executed in this iteration**:

```bash
gdalinfo -json orthophoto.tif
gdalwarp -t_srs EPSG:3857 -r bilinear -dstalpha orthophoto.tif orthophoto-3857.tif
gdal raster tile --tiling-scheme WebMercatorQuad --convention xyz --tile-size 256 --min-zoom 12 --max-zoom 20 --format PNG --add-alpha --skip-blank --webviewer none orthophoto-3857.tif tiles
```

`gdal raster tile` is available from GDAL 3.11; consult the installed version's help before processing. It supports WebMercatorQuad, XYZ and alpha output. [GDAL tile documentation](https://gdal.org/en/stable/programs/gdal_raster_tile.html). Older installations can use `gdal2tiles --xyz -p mercator`; that utility is deprecated starting with GDAL 3.13. [GDAL legacy tiling documentation](https://gdal.org/en/stable/programs/gdal2tiles.html).

With no backend to extend, pre-generated tiles on existing static hosting/object storage are the smallest path. Serve `/surveys/{id}/{z}/{x}/{y}.png`, preserve transparent nodata, return a transparent image or 404 for absent tiles, and configure HTTPS/CORS. Version paths for imagery updates. For frequent or large dynamic datasets, evaluate a COG plus a TiTiler-compatible tile service after the backend/storage/authentication design is known. Do not build that infrastructure into the frontend. Private imagery will need a suitable signed-URL or same-origin authorization design; the current browser image adapter cannot attach bearer headers.

## Ward geometry

For authoritative production boundaries, supply an NMC Polygon/MultiPolygon GeoJSON FeatureCollection in WGS84 with **longitude, latitude** coordinate order. Features can supply canonical string `properties.id`/`properties.name` or source `ward_id`/`ward_name`. The loader derives a string ID and name from source fields only when canonical fields are absent, preserves original properties and geometry, and rejects duplicate IDs. Closed rings and geographic ranges are validated before rendering. The source must be same-origin or allow CORS. Ward clicks and searched wards select the matching feature and fit its bounds. Ward IDs in site/LunchBox/intervention records can refer to those stable IDs. Point-in-polygon assignments belong in data preparation or the backend, with provenance; demo area labels are not authoritative ward assignments.

The first supplied boundary is now bundled at `public/data/ward_07.geojson`: **Ward No.7, ID 7 only**. It is a user/manually traced conversion from `Ward_No_7.kml`, not verified against authoritative municipal GIS data. The static file is an unchanged copy of the supplied GeoJSON; all 46 ring vertices match the KML longitude/latitude sequence. Bounds are west 73.75537815270326, east 73.79001243571838, south 20.00065270780508, north 20.02315980538674. Structural validation and Google display do not establish the accuracy of municipal delimitation.

An empty `VITE_WARDS_GEOJSON_URL` loads this asset (respecting Vite's base path); a nonempty value replaces it. Additional wards can be added as features in a larger collection through the same URL/pipeline. No per-ward rendering code is needed. The UI retains boundary status and source metadata, makes partial coverage visible via the loaded count, and keeps ward selection while the layer is hidden. No observations, risk scores, statistics or site-to-ward assignments were inferred from this boundary.

No NMC PDF exists in this frontend folder. A municipal PDF supplied later is only a visual reference and must not be treated as machine-readable official geometry. Synthetic polygons remain confined to automated tests.

## Inputs for the next orthophoto iteration

1. Original WebODM orthophoto GeoTIFF (or accessible file/object URL), survey ID, name, capture date, area and ownership/access requirements.
2. Embedded CRS/geotransform, raster dimensions, pixel size/GSD, band types and nodata/alpha; preferably `gdalinfo -json` output and known validation/control points.
3. Transformed EPSG:4326 bounds/footprint from the processing job, plus intended zoom range and opacity.
4. Either an actual rectified small browser image and its bounds, or a reachable WebMercatorQuad XYZ tile URL template with 256-pixel tiles, alpha, coverage, supported zooms, CORS and access rules.
5. Survey metadata endpoint matching the contract, and a configured Google browser key/map ID for alignment checks.

Actual LunchBox locations/observations and authoritative ward geometry are independent additional inputs, not prerequisites for a survey overlay.

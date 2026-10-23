# Drone Map — first-flight imagery

The supplied `Drone_First_Flight/data/photogrammetry/Area_A` through `Area_D` folders contain the sources for the working imagery overlay. Each has an original orthophoto GeoTIFF, WebODM quality report, DSM, point cloud, model and camera-position data. The sources were relocated into this layout on 20 October 2026; older checkpoints retain their original paths. Only orthophotos and capture dates from the reports are needed for this implementation. Source files remain outside the public directory and are opened read-only during processing. See [project context](../PROJECT_CONTEXT.md) for the separate annotation and backend workstreams.

## Use the map

Open Sites & Map → Layers, keep **Streets** or **Satellite** selected, then enable **Drone Map overlay**. The first enable selects all four ready areas and fits their combined bounds. Individual area checkboxes are independent. The master toggle hides the overlays while retaining the area choices. Opacity defaults to 85% and can be adjusted from 0–100%. Select an area to view metadata and fit its bounds, or use its **Zoom to survey** button. The base map remains visible outside actual transparent coverage; no imagery is invented between the surveys.

All four datasets have capture dates of **19 August 2026**, confirmed from their WebODM reports. The map uses the capture date, not the processing date. Capture-time strings in the processing audit are preserved as reported without assigning an unconfirmed timezone.

## Processing actually executed

`tools/prepare_drone_tiles.py` validates the embedded EPSG:32643 CRS and RGB/alpha bands, transforms densified bounds to WGS84 for metadata, and uses Rasterio's GDAL-backed WarpedVRT to resample the imagery onto an aligned EPSG:3857 tile grid. This is a real reprojection; UTM eastings/northings never enter Google latitude/longitude fields. See [Rasterio virtual warping](https://rasterio.readthedocs.io/en/latest/topics/virtual-warping.html).

The original imagery is UInt16 RGB with a UInt16 alpha band whose valid values are 0/255. RGB is converted using the full 16-bit range (`/257`), without separate contrast stretches. GDAL source/destination alpha maxima are explicitly 255. Lower zooms are derived with alpha-aware resizing. Every tile in the bounded grid is written, including transparent edge/empty tiles, so normal gaps do not become 404 warnings.

| Area | Source raster pixels | Generated tiles | PNG size |
| --- | --- | --- | --- |
| A | 41,225 × 7,454 | 663 | 63.0 MiB |
| B | 9,918 × 5,274 | 136 | 9.7 MiB |
| C | 13,996 × 20,000 | 588 | 54.0 MiB |
| D | 9,618 × 8,189 | 243 | 17.9 MiB |

Total: **1,630 tiles, approximately 144.5 MiB**, at zooms 14–22, each 256px RGBA PNG. Zoom 22 provides approximately 3.5cm ground pixels near these areas; this display pyramid is downsampled from roughly 1cm source pixels. Original-resolution GeoTIFFs remain available for analysis outside the browser. Rasterio 1.5.2 / GDAL 3.12.2 were used.

Generated assets:

- `frontend/public/drone/surveys.json`: the existing survey-layer contract, four real `ready` XYZ sources.
- `frontend/public/drone/area-{a,b,c,d}/{z}/{x}/{y}.png`: same-origin imagery tiles, copied to `dist` by Vite.
- `frontend/public/drone/processing-audit.json`: source dimensions/CRS/bounds/transform, conversion rules, capture-date provenance, output sizes and tool versions.

The existing loader defaults to the bundled metadata and retains `VITE_SURVEYS_METADATA_URL` as an override. Bundled paths respect the Vite base path. An external production tile host can be used by replacing metadata URL templates with absolute HTTPS endpoints; CORS/access rules must allow browser image requests. This overlay uses static assets and does not depend on the separate private storage/LunchBox backend. Tile requests are limited to visible map tiles, declared bounds and zoom range; the full GeoTIFF is never loaded into the browser.

## Reprocessing

Run offline tooling from the repository root. The default output is now `frontend/public/drone`; use a fresh staging directory for a new run. Recorded `sourceFile` and `dateSource` paths in the processing audit remain repository-root-relative. Browser URLs remain `/drone/...`.

Use a Python environment containing rasterio, numpy, Pillow and pypdf:

```bash
python tools/prepare_drone_tiles.py --input Drone_First_Flight/data/photogrammetry --output tmp/drone-reprocess --min-zoom 14 --max-zoom 22
```

Choose a fresh output folder for each run; `tmp/drone-reprocess` above is an example staging destination. The script still defaults to the historical `Drone_First_Flight/Area_*` layout, so the explicit `--input` is required for the current layout. It generates metadata URLs beginning `/drone/`; a staging run does not publish or switch the application automatically. Inspect the output before publishing matching tiles/metadata under the intended served path.

An optional `--dependency-dir` supports an existing separately installed GIS package directory. The original processing reused GIS tools in Work_Vault. The drone workspace also contains Windows-specific bundles described in its [tooling guide](../Drone_First_Flight/tooling/README.md); interpreter compatibility and required libraries must be checked before use. For replacement imagery, process into a fresh versioned output folder, validate it, and then update metadata rather than partially overwriting a live deployment. Raw source files and temporary previews are ignored by Git; public tiles must be included in deployment.

## Validation and limits

The regression suite checks actual survey metadata, served RGBA PNGs, bounded tile URLs, combined survey bounds, master/area visibility, opacity, base-map choice and honest metadata failures. A separate live Google Maps test confirms successful tile responses from all four areas, area hide/show, opacity, Streets/Satellite behavior and zero raw-TIFF requests. Streets, Satellite and hidden-overlay screenshots were visually inspected.

This confirms display and interaction, not independently verified positional accuracy. GPS-based WebODM georeferencing, temporal differences from Google imagery, photogrammetric artifacts and offsets must be assessed against ground control/checkpoints before precise measurement or operational boundary decisions. The map now uses the owner-approved [31-ward collection](WARD_BOUNDARIES.md); imagery is not clipped to ward boundaries. Overlaps use metadata order A → B → C → D, with later areas above earlier areas, rather than silently mosaicking or changing imagery. No mosquito observations or risk classifications were inferred.

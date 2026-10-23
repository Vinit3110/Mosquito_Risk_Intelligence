"""Offline WebODM orthophoto -> bounded, alpha-preserving Web Mercator XYZ tiles.

Requires rasterio (GDAL), numpy, Pillow, pypdf. Never writes to source files.
"""
import argparse
import json
import math
import re
import sys
from datetime import datetime
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--input', type=Path, default=Path('Drone_First_Flight'))
parser.add_argument('--output', type=Path, default=Path('frontend/public/drone'))
parser.add_argument('--dependency-dir', type=Path)
parser.add_argument('--min-zoom', type=int, default=14)
parser.add_argument('--max-zoom', type=int, default=22)
args = parser.parse_args()
if args.dependency_dir:
    sys.path.insert(0, str(args.dependency_dir.resolve()))

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_origin
from rasterio.vrt import WarpedVRT
from rasterio.warp import transform_bounds
from rasterio.windows import Window
from PIL import Image
from pypdf import PdfReader

HALF_WORLD = math.pi * 6378137
TILE_SIZE = 256
if not 0 <= args.min_zoom <= args.max_zoom <= 22:
    raise ValueError('Supported zoom range is 0–22.')
args.output.mkdir(parents=True, exist_ok=True)
metadata, audit = [], []

def tile_range(bounds, zoom):
    span = 2 * HALF_WORLD / (2 ** zoom)
    west, south, east, north = bounds
    return (math.floor((west + HALF_WORLD) / span), math.floor((HALF_WORLD - north) / span),
            math.floor((east + HALF_WORLD) / span), math.floor((HALF_WORLD - south) / span))

def save(image, folder, zoom, x, y):
    path = folder / str(zoom) / str(x) / f'{y}.png'
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, compress_level=3)
    return path.stat().st_size

with rasterio.Env(GDAL_CACHEMAX=128 * 1024 * 1024):
    for area in ['A', 'B', 'C', 'D']:
        path = args.input / f'Area_{area}' / 'orthophoto.tif'
        report = path.with_name('report.pdf')
        text = PdfReader(report).pages[0].extract_text()
        capture = re.search(r'Capture Start\s+(\d{2}/\d{2}/\d{4}) at (\d{2}:\d{2}:\d{2})', text)
        if not capture:
            raise ValueError(f'{report}: no capture date; do not invent a survey date.')
        date = datetime.strptime(capture.group(1), '%d/%m/%Y').date().isoformat()
        folder = args.output / f'area-{area.lower()}'
        with rasterio.open(path) as source:
            if source.crs is None or source.crs.to_epsg() != 32643:
                raise ValueError(f'{path}: expected verified embedded EPSG:32643 CRS.')
            if source.count != 4 or list(source.dtypes) != ['uint16'] * 4 or [c.name for c in source.colorinterp] != ['red', 'green', 'blue', 'alpha']:
                raise ValueError(f'{path}: unsupported bands; inspect before choosing a color/alpha conversion.')
            geographic = transform_bounds(source.crs, 'EPSG:4326', *source.bounds, densify_pts=41)
            mercator = transform_bounds(source.crs, 'EPSG:3857', *source.bounds, densify_pts=41)
            x0, y0, x1, y1 = tile_range(mercator, args.max_zoom)
            resolution = 2 * HALF_WORLD / (256 * 2 ** args.max_zoom)
            transform = from_origin(-HALF_WORLD + x0 * 256 * resolution, HALF_WORLD - y0 * 256 * resolution, resolution, resolution)
            count, size, valid_pixels = 0, 0, 0
            # RGB uses the full UInt16 range; alpha in these supplied files is 0/255.
            # Make alpha normalization explicit to GDAL despite the UInt16 band type.
            with WarpedVRT(source, crs='EPSG:3857', transform=transform,
                           width=(x1 - x0 + 1) * 256, height=(y1 - y0 + 1) * 256,
                           resampling=Resampling.bilinear, src_alpha=4,
                           SRC_ALPHA_MAX='255', DST_ALPHA_MAX='255', warp_mem_limit=128) as vrt:
                for y in range(y0, y1 + 1):
                    for x in range(x0, x1 + 1):
                        data = vrt.read(window=Window((x - x0) * 256, (y - y0) * 256, 256, 256))
                        if data[3].max() > 255:
                            raise ValueError('Unexpected alpha scale; inspect GDAL alpha handling before publishing.')
                        rgba = np.empty((256, 256, 4), dtype=np.uint8)
                        rgba[:, :, :3] = np.rint(data[:3].transpose(1, 2, 0) / 257).astype(np.uint8)
                        rgba[:, :, 3] = data[3].astype(np.uint8)
                        valid_pixels += int(np.count_nonzero(rgba[:, :, 3]))
                        size += save(Image.fromarray(rgba), folder, args.max_zoom, x, y)
                        count += 1
            # Derive lower zooms from already reprojected tiles; RGBA resize uses
            # premultiplied alpha so transparent margins do not create dark seams.
            for zoom in range(args.max_zoom - 1, args.min_zoom - 1, -1):
                x0, y0, x1, y1 = tile_range(mercator, zoom)
                for y in range(y0, y1 + 1):
                    for x in range(x0, x1 + 1):
                        mosaic = Image.new('RGBA', (512, 512))
                        for dy in [0, 1]:
                            for dx in [0, 1]:
                                child = folder / str(zoom + 1) / str(x * 2 + dx) / f'{y * 2 + dy}.png'
                                if child.exists():
                                    with Image.open(child) as image:
                                        mosaic.paste(image, (dx * 256, dy * 256))
                        size += save(mosaic.resize((256, 256), Image.Resampling.BOX), folder, zoom, x, y)
                        count += 1
            if valid_pixels == 0:
                raise ValueError(f'{path}: reprojection produced no visible imagery.')
            metadata.append(dict(id=f'area-{area.lower()}', name=f'Area {area}', date=date,
                sourceCrs='EPSG:32643', status='ready',
                bounds=dict(west=geographic[0], south=geographic[1], east=geographic[2], north=geographic[3]),
                imagery=dict(kind='xyz', urlTemplate=f'/drone/area-{area.lower()}/{{z}}/{{x}}/{{y}}.png', minZoom=args.min_zoom, maxZoom=args.max_zoom, opacity=1, tileSize=256),
                message='WebODM orthophoto · GPS georeferenced; positional accuracy not independently verified'))
            audit.append(dict(id=f'area-{area.lower()}', sourceFile=str(path.as_posix()), sourceBytes=path.stat().st_size,
                dimensions=[source.width, source.height], crs=str(source.crs), sourceBounds=list(source.bounds),
                sourceTransform=list(source.transform), nativePixelSizeM=list(source.res),
                captureDate=date, captureTimeAsReported=capture.group(2), dateSource=str(report.as_posix()),
                tileCount=count, tileBytes=size, visiblePixelsAtMaxZoom=valid_pixels,
                webMercatorPixelSizeM=resolution, approximateGroundPixelSizeM=resolution * math.cos(math.radians((geographic[1] + geographic[3]) / 2)),
                rgbConversion='UInt16 / 257 -> UInt8, no per-area contrast stretch',
                alphaConversion='preserved source 0..255 alpha; explicit GDAL SRC/DST_ALPHA_MAX=255',
                gdalVersion=rasterio.__gdal_version__, rasterioVersion=rasterio.__version__))
            print(f'Area {area}: {count} tiles, {size / 1048576:.1f} MiB, capture {date}', flush=True)

(args.output / 'surveys.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf8')
(args.output / 'processing-audit.json').write_text(json.dumps(audit, indent=2) + '\n', encoding='utf8')
print('Published metadata and audit after all four areas completed.', flush=True)

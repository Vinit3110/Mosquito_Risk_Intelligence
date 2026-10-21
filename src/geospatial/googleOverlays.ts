import { surveyTileUrl } from './validation';
import type { SurveyLayer } from './types';

/** Only rendering lives here. Reprojection/tiling belongs in the GIS pipeline. */
export function attachSurveyOverlay(map: google.maps.Map, survey: SurveyLayer, onError: (message: string) => void): () => void {
  if (survey.status !== 'ready' || !survey.bounds || !survey.imagery) return () => {};
  const source = survey.imagery;
  if (source.kind === 'ground') {
    const image = new Image();
    const overlay = new google.maps.GroundOverlay(source.url, survey.bounds, { opacity: source.opacity });
    image.onload = () => overlay.setMap(map);
    image.onerror = () => onError(`${survey.name}: prototype image unavailable`);
    image.src = source.url;
    return () => { image.onload = null; image.onerror = null; overlay.setMap(null); };
  }
  // An owned XYZ overlay: Google requests only visible tiles. Missing tiles stay transparent.
  const overlay: google.maps.MapType = {
    alt: `${survey.name} orthophoto`,
    projection: null,
    radius: 6378137,
    tileSize: new google.maps.Size(source.tileSize, source.tileSize),
    minZoom: source.minZoom,
    maxZoom: source.maxZoom,
    name: survey.name,
    getTile(coord, zoom, ownerDocument) {
      const tile = ownerDocument.createElement('div');
      tile.style.width = tile.style.height = `${source.tileSize}px`;
      const url = surveyTileUrl(survey, coord.x, coord.y, zoom);
      if (url) {
        const image = ownerDocument.createElement('img');
        image.alt = '';
        image.style.width = image.style.height = '100%';
        image.style.opacity = String(source.opacity);
        image.onerror = () => { image.remove(); onError(`${survey.name}: some tiles unavailable; missing imagery remains transparent`); };
        image.src = url;
        tile.append(image);
      }
      return tile;
    },
    releaseTile(tile) {
      tile?.querySelectorAll('img').forEach(image => { image.onerror = null; image.removeAttribute('src'); });
      tile?.remove();
    },
  };
  map.overlayMapTypes.push(overlay);
  return () => {
    const index = map.overlayMapTypes.getArray().indexOf(overlay);
    if (index >= 0) map.overlayMapTypes.removeAt(index);
  };
}

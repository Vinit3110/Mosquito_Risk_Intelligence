import type { GeographicBounds, Position, SurveyLayer, WardCollection } from './types';

export function isPosition(p: Position): boolean {
  return Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 85.05112878 && Math.abs(p.lng) <= 180;
}
export function isBounds(b: GeographicBounds): boolean {
  return isPosition({ lat: b.north, lng: b.east }) && isPosition({ lat: b.south, lng: b.west }) && b.north > b.south && b.east > b.west;
}
function validUrl(url: string): boolean {
  try { return ['https:', 'http:'].includes(new URL(url, 'https://local.invalid').protocol); } catch { return false; }
}
export function validateSurveys(value: unknown): SurveyLayer[] {
  if (!Array.isArray(value)) throw new Error('Survey metadata must be an array.');
  const ids = new Set<string>();
  for (const s of value) {
    if (!s || typeof s.id !== 'string' || !s.id || ids.has(s.id) || typeof s.name !== 'string' || typeof s.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.date) || !Number.isFinite(Date.parse(`${s.date}T00:00:00Z`)) || new Date(`${s.date}T00:00:00Z`).toISOString().slice(0, 10) !== s.date || s.sourceCrs !== 'EPSG:32643' || !['awaiting-data', 'processing', 'ready', 'error'].includes(s.status)) {
      throw new Error('Invalid or duplicate survey metadata.');
    }
    ids.add(s.id);
    if (s.bounds && !isBounds(s.bounds)) throw new Error('Survey bounds must be WGS84 geographic degrees.');
    if (s.status === 'ready' && (!s.bounds || !s.imagery)) throw new Error('Ready surveys require bounds and an imagery source.');
    if (s.imagery) {
      const i = s.imagery;
      if (!Number.isFinite(i.opacity) || i.opacity < 0 || i.opacity > 1) throw new Error('Invalid imagery opacity.');
      if (i.kind === 'ground') {
        if (typeof i.url !== 'string' || !validUrl(i.url) || /\.tiff?(?:\?|$)/i.test(i.url)) throw new Error('Ground imagery must be a browser image URL, not a GeoTIFF.');
      } else if (i.kind === 'xyz') {
        if (typeof i.urlTemplate !== 'string' || !validUrl(i.urlTemplate) || !['{z}', '{x}', '{y}'].every(token => i.urlTemplate.includes(token)) || i.tileSize !== 256 || !Number.isInteger(i.minZoom) || !Number.isInteger(i.maxZoom) || i.minZoom < 0 || i.maxZoom > 22 || i.maxZoom < i.minZoom) throw new Error('Invalid XYZ tile source.');
      } else throw new Error('Unsupported imagery source.');
    }
  }
  return value as SurveyLayer[];
}
export function validateWards(value: unknown): WardCollection {
  const data = value as WardCollection;
  if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw new Error('Ward data must be a GeoJSON FeatureCollection.');
  const ids = new Set<string>();
  const features = data.features.map(f => {
    const properties = f?.properties;
    // Keep source fields and coordinates intact; expose one canonical application contract.
    const originalId = properties?.ward_id;
    const id = properties?.id ?? (typeof originalId === 'string' || typeof originalId === 'number' && Number.isFinite(originalId) ? String(originalId) : undefined);
    const name = properties?.name ?? properties?.ward_name;
    if (!f || f.type !== 'Feature' || !properties || typeof id !== 'string' || !id.trim() || ids.has(id) || typeof name !== 'string' || !name.trim() || !f.geometry || !['Polygon', 'MultiPolygon'].includes(f.geometry.type)) throw new Error('Wards require unique string ids, names, and polygon geometry.');
    ids.add(id);
    const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    if (!Array.isArray(polygons) || !polygons.length || !polygons.every(p => Array.isArray(p) && p.length && p.every(r => Array.isArray(r) && r.length >= 4 && r.every(c => Array.isArray(c) && c.length >= 2 && isPosition({ lng: c[0], lat: c[1] })) && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1]))) throw new Error('Ward coordinates must be closed WGS84 longitude/latitude rings.');
    return { ...f, properties: { ...properties, id, name } };
  });
  return { ...data, features };
}
/** Return no URL outside geographic coverage or supported zooms. XYZ y increases south. */
export function surveyTileUrl(survey: SurveyLayer, x: number, y: number, z: number): string | null {
  const i = survey.imagery, b = survey.bounds;
  if (!b || !i || i.kind !== 'xyz' || z < i.minZoom || z > i.maxZoom) return null;
  const n = 2 ** z;
  if (y < 0 || y >= n) return null;
  x = ((x % n) + n) % n;
  const latitude = (row: number) => Math.atan(Math.sinh(Math.PI * (1 - 2 * row / n))) * 180 / Math.PI;
  const west = x / n * 360 - 180, east = (x + 1) / n * 360 - 180;
  if (east <= b.west || west >= b.east || latitude(y) <= b.south || latitude(y + 1) >= b.north) return null;
  return i.urlTemplate.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
}

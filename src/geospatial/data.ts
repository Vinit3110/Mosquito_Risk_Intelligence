import type { GeographicBounds, LunchBoxLocation, Position, SurveyLayer } from './types';
import type { WardProperties } from './types';

/** Vite base path keeps the bundled source usable when hosted in a subdirectory. */
export const DEFAULT_WARDS_URL = `${import.meta.env?.BASE_URL ?? '/'}data/ward_07.geojson`;
export const DEFAULT_SURVEYS_URL = `${import.meta.env?.BASE_URL ?? '/'}drone/surveys.json`;
export function visibleSurveyBounds(surveys: SurveyLayer[], visibility: Record<string, boolean>): GeographicBounds | undefined {
  const bounds = surveys.filter(s => s.status === 'ready' && visibility[s.id]).flatMap(s => s.bounds ? [s.bounds] : []);
  if (!bounds.length) return undefined;
  return { north: Math.max(...bounds.map(b => b.north)), south: Math.min(...bounds.map(b => b.south)), east: Math.max(...bounds.map(b => b.east)), west: Math.min(...bounds.map(b => b.west)) };
}
export function wardMatchesQuery(properties: WardProperties, query: string): boolean {
  const searchable = `${properties.id} ${properties.name} Ward ${properties.ward_id ?? properties.id}`;
  return searchable.toLowerCase().includes(query.trim().toLowerCase());
}

export const NASHIK_CENTER: Position = { lat: 19.9975, lng: 73.7898 };
export const DEFAULT_ZOOM = 12;
// These are search destinations, not surveillance observations or official wards.
export const localPlaces = [
  { id: 'nashik', name: 'Nashik city centre', position: NASHIK_CENTER },
  { id: 'panchavati', name: 'Panchavati', position: { lat: 20.0124, lng: 73.7926 } },
  { id: 'satpur', name: 'Satpur', position: { lat: 20.0111, lng: 73.7444 } },
  { id: 'cidco', name: 'CIDCO', position: { lat: 19.9758, lng: 73.7575 } },
  { id: 'nashik-road', name: 'Nashik Road', position: { lat: 19.9537, lng: 73.8395 } },
  { id: 'gangapur', name: 'Gangapur Road', position: { lat: 20.0231, lng: 73.7656 } },
  { id: 'indira', name: 'Indira Nagar', position: { lat: 19.9829, lng: 73.7957 } },
];
export const lunchBoxLocations: LunchBoxLocation[] = [];
export const pendingSurveys: SurveyLayer[] = ['A', 'B', 'C', 'D'].map(area => ({
  id: `area-${area.toLowerCase()}`,
  name: `Area ${area}`,
  date: '2026-08-19',
  sourceCrs: 'EPSG:32643',
  status: 'awaiting-data',
  message: 'Demo entry · awaiting survey imagery',
}));

import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

/** Geographic WGS84 degrees. Never UTM eastings/northings. */
export interface Position { lat: number; lng: number }
export interface GeographicBounds { north: number; south: number; east: number; west: number }
export interface MapMarker {
  id: string;
  name: string;
  position: Position;
  kind: 'site' | 'hotspot' | 'lunchbox';
  priority?: 'High' | 'Medium' | 'Low';
}
export interface LunchBoxLocation { id: string; name: string; position: Position; wardId?: string }
export interface WardProperties { id: string; name: string; [key: string]: unknown }
export type WardCollection = FeatureCollection<Polygon | MultiPolygon, WardProperties>;
export interface InterventionZone { id: string; name: string; geometry: Polygon | MultiPolygon; wardId?: string }
export type ImagerySource =
  | { kind: 'ground'; url: string; opacity: number }
  | { kind: 'xyz'; urlTemplate: string; minZoom: number; maxZoom: number; opacity: number; tileSize: 256 };
export interface SurveyLayer {
  id: string;
  name: string;
  date: string;
  sourceCrs: 'EPSG:32643';
  bounds?: GeographicBounds;
  imagery?: ImagerySource;
  status: 'awaiting-data' | 'processing' | 'ready' | 'error';
  message?: string;
}
export interface LayerVisibility {
  baseMap: 'roadmap' | 'satellite';
  hotspots: boolean;
  lunchboxes: boolean;
  wards: boolean;
  droneMap: boolean;
  droneOpacity: number;
  surveys: Record<string, boolean>;
}

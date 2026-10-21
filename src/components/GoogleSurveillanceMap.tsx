import { useEffect, useRef, useState } from 'react';
import { Crosshair, Minus, Plus } from 'lucide-react';
import { DEFAULT_ZOOM, NASHIK_CENTER } from '../geospatial/data';
import { loadGoogleMaps } from '../geospatial/googleLoader';
import { attachSurveyOverlay } from '../geospatial/googleOverlays';
import { attachWardLayer } from '../geospatial/googleWards';
import { isPosition } from '../geospatial/validation';
import type { GeographicBounds, LayerVisibility, MapMarker, Position, SurveyLayer, WardCollection } from '../geospatial/types';

interface Props {
  center?: Position;
  zoom?: number;
  markers: MapMarker[];
  selectedId?: string;
  onSelect: (id: string) => void;
  focus?: { position: Position; bounds?: GeographicBounds; token: number };
  layers: LayerVisibility;
  surveys?: SurveyLayer[];
  wards?: WardCollection;
  selectedWardId?: string;
  onWardSelect?: (id: string) => void;
}
const NO_SURVEYS: SurveyLayer[] = [];

export function GoogleSurveillanceMap({ center = NASHIK_CENTER, zoom = DEFAULT_ZOOM, markers, selectedId, onSelect, focus, layers, surveys = NO_SURVEYS, wards, selectedWardId, onWardSelect }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map>();
  const [markerLibrary, setMarkerLibrary] = useState<google.maps.MarkerLibrary>();
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [overlayError, setOverlayError] = useState('');
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();

  useEffect(() => {
    if (!apiKey || !host.current) return;
    const element = host.current;
    let cancelled = false;
    let instance: google.maps.Map | undefined;
    let idleListener: google.maps.MapsEventListener | undefined;
    const fail = (message: string) => { if (!cancelled) { setError(message); setState('error'); } };
    const previousAuthFailure = window.gm_authFailure;
    const authFailure = () => fail('Google Maps rejected this configuration. Check billing, API activation, and key restrictions.');
    window.gm_authFailure = authFailure;
    const timer = window.setTimeout(() => fail('Google Maps did not become ready. Check connectivity, your API key, and browser restrictions.'), 20000);
    void loadGoogleMaps(apiKey).then(({ maps, markers: library }) => {
      if (cancelled || !host.current) return;
      instance = new maps.Map(host.current, {
        center, zoom, mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID',
        mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
        zoomControl: false, gestureHandling: 'greedy', clickableIcons: false,
      });
      setMap(instance);
      setMarkerLibrary(library);
      idleListener = google.maps.event.addListenerOnce(instance, 'idle', () => {
        window.clearTimeout(timer);
        if (!cancelled) setState(current => current === 'error' ? current : 'ready');
      });
    }).catch(() => fail('Google Maps failed to load. Check your connection and allowed domains.'));
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      idleListener?.remove();
      if (window.gm_authFailure === authFailure) window.gm_authFailure = previousAuthFailure;
      if (instance) google.maps.event.clearInstanceListeners(instance);
      element.replaceChildren();
    };
  }, [apiKey, center, zoom]);

  useEffect(() => { map?.setMapTypeId(layers.baseMap); }, [map, layers.baseMap]);
  useEffect(() => {
    if (map && focus && isPosition(focus.position)) {
      if (focus.bounds) map.fitBounds(focus.bounds, { top: 85, right: 90, bottom: 90, left: 40 });
      else { map.panTo(focus.position); map.setZoom(Math.max(map.getZoom() ?? zoom, 14)); }
    }
  }, [map, focus, zoom]);

  useEffect(() => {
    if (!map || !markerLibrary) return;
    const rendered = markers.filter(marker => isPosition(marker.position) && (marker.kind === 'lunchbox' ? layers.lunchboxes : marker.kind === 'hotspot' ? layers.hotspots : true)).map(marker => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `surveillance-marker ${marker.kind} ${selectedId === marker.id ? 'selected' : ''}`;
      button.style.setProperty('--marker-color', marker.priority === 'High' ? '#c85353' : marker.priority === 'Medium' ? '#d28a2d' : marker.priority === 'Low' ? '#3b8270' : '#315d8a');
      button.title = marker.name;
      button.setAttribute('aria-label', `${marker.id}: ${marker.name}`);
      button.textContent = marker.kind === 'lunchbox' ? 'L' : marker.kind === 'site' ? 'S' : '•';
      const onClick = () => onSelect(marker.id);
      button.addEventListener('click', onClick);
      const pin = new markerLibrary.AdvancedMarkerElement({ map, position: marker.position, title: marker.name, content: button, zIndex: selectedId === marker.id ? 100 : 1 });
      return () => { button.removeEventListener('click', onClick); pin.map = null; };
    });
    return () => rendered.forEach(remove => remove());
  }, [map, markerLibrary, markers, selectedId, onSelect, layers.hotspots, layers.lunchboxes]);

  useEffect(() => {
    if (!map || !wards || !layers.wards) return;
    try { return attachWardLayer(map, wards, selectedWardId, onWardSelect); }
    catch { setOverlayError('Ward geometry could not be rendered. Check supplied GeoJSON.'); }
  }, [map, wards, layers.wards, selectedWardId, onWardSelect]);

  useEffect(() => {
    if (!map) return;
    setOverlayError('');
    const cleanup = layers.droneMap ? surveys.filter(s => layers.surveys[s.id]).map(s => attachSurveyOverlay(map, { ...s, imagery: s.imagery ? { ...s.imagery, opacity: s.imagery.opacity * layers.droneOpacity } : undefined }, setOverlayError)) : [];
    return () => cleanup.forEach(remove => remove());
  }, [map, surveys, layers.surveys, layers.droneMap, layers.droneOpacity]);

  const unavailable = !apiKey || state === 'error';
  return <div className="google-map-shell">
    <div ref={host} className="google-map-canvas" aria-label="Google map of Nashik mosquito surveillance" />
    {(!apiKey || state !== 'ready') && <div className="google-map-state" role={unavailable ? 'alert' : 'status'}>
      <Crosshair size={28} />
      <strong>{!apiKey ? 'Google Maps configuration required' : state === 'error' ? 'Google Maps unavailable' : 'Loading Google Maps…'}</strong>
      <p>{!apiKey ? 'Set VITE_GOOGLE_MAPS_API_KEY in .env.local and restart the development server. Site search and records remain available.' : error || 'Connecting to the Nashik basemap.'}</p>
      {unavailable && <small>No substitute map is displayed.</small>}
      {state === 'error' && <button className="secondary-button" onClick={() => window.location.reload()}>Retry map</button>}
    </div>}
    <div className="google-map-controls" aria-label="Map navigation">
      <button disabled={state !== 'ready'} onClick={() => map?.setZoom((map.getZoom() ?? zoom) + 1)} aria-label="Zoom in"><Plus size={17} /></button>
      <button disabled={state !== 'ready'} onClick={() => map?.setZoom((map.getZoom() ?? zoom) - 1)} aria-label="Zoom out"><Minus size={17} /></button>
      <button disabled={state !== 'ready'} onClick={() => { map?.panTo(center); map?.setZoom(zoom); }} aria-label="Reset to Nashik"><Crosshair size={17} /></button>
    </div>
    {overlayError && <div className="overlay-error" role="status">{overlayError}</div>}
  </div>;
}

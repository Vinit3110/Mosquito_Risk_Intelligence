import { useCallback, useRef, useState, useEffect } from 'react';
import Map, {
  Marker,
  AttributionControl,
  Popup,
} from 'react-map-gl/maplibre';
import { setWorkerUrl } from 'maplibre-gl';
import maplibreWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Site } from '../domain';

// Fix MapLibre worker URL resolution in Vite dev mode
setWorkerUrl(maplibreWorker);

// Nashik city centre
const NASHIK_CENTER = { longitude: 73.7898, latitude: 19.9975 };
const DEFAULT_ZOOM = 11.5;

/**
 * Free vector tile basemap from openfreemap.org — no API key required.
 * Attribution: © OpenFreeMap contributors, © OpenStreetMap contributors
 * https://openfreemap.org
 */
const BASEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

function priorityColor(priority: Site['priority']) {
  if (priority === 'High') return '#d64545';
  if (priority === 'Medium') return '#d48a1c';
  return '#2e8b68';
}

function PinMarker({
  site,
  selected,
  onClick,
}: {
  site: Site;
  selected: boolean;
  onClick: () => void;
}) {
  const color = priorityColor(site.priority);
  return (
    <Marker
      longitude={site.coordinates!.lng}
      latitude={site.coordinates!.lat}
      anchor="bottom"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick();
      }}
    >
      <button
        type="button"
        className={`map-pin ${selected ? 'selected' : ''}`}
        style={{ '--pin-color': color } as React.CSSProperties}
        aria-label={`${site.id}: ${site.label}. Priority: ${site.priority}. Status: ${site.status}`}
        title={`${site.id} — ${site.label}`}
      >
        <span className="map-pin-inner" />
        {selected && <span className="map-pin-ring" />}
      </button>
    </Marker>
  );
}

export function NashikMapGL({
  sites,
  selectedId,
  onSelect,
}: {
  sites: Site[];
  selectedId?: string;
  onSelect: (site: Site) => void;
}) {
  const mapRef = useRef<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [hoveredSite] = useState<Site | null>(null);

  // Fly to selected site marker
  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const site = sites.find((s) => s.id === selectedId);
    if (site?.coordinates) {
      mapRef.current.flyTo({
        center: [site.coordinates.lng, site.coordinates.lat],
        zoom: Math.max(mapRef.current.getZoom(), 14),
        duration: 700,
      });
    }
  }, [selectedId, sites]);

  const handleResetView = useCallback(() => {
    mapRef.current?.flyTo({
      center: [NASHIK_CENTER.longitude, NASHIK_CENTER.latitude],
      zoom: DEFAULT_ZOOM,
      duration: 700,
    });
  }, []);

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn({ duration: 300 });
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut({ duration: 300 });
  }, []);

  const selectedSiteForPopup = hoveredSite;

  return (
    <div className="mapgl-shell" aria-label="MapLibre interactive map — Nashik mosquito surveillance sites">
      {mapError ? (
        <div className="map-error-state">
          <span className="map-error-icon">⚠</span>
          <strong>Basemap unavailable</strong>
          <p>{mapError}</p>
          <small>Site markers are still available once tiles load. Check internet connectivity.</small>
        </div>
      ) : null}

      <Map
        ref={mapRef}
        initialViewState={{
          longitude: NASHIK_CENTER.longitude,
          latitude: NASHIK_CENTER.latitude,
          zoom: DEFAULT_ZOOM,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={BASEMAP_STYLE}
        attributionControl={false}
        onError={(e) => setMapError(String(e.error?.message ?? 'Map tiles could not be loaded.'))}
      >
        <AttributionControl
          compact
          customAttribution="© OpenFreeMap · © OpenStreetMap contributors"
          style={{ right: 0, bottom: 0 }}
        />

        {sites.map((site) =>
          site.coordinates ? (
            <PinMarker
              key={site.id}
              site={site}
              selected={selectedId === site.id}
              onClick={() => onSelect(site)}
            />
          ) : null
        )}

        {selectedSiteForPopup && selectedSiteForPopup.coordinates && (
          <Popup
            longitude={selectedSiteForPopup.coordinates.lng}
            latitude={selectedSiteForPopup.coordinates.lat}
            anchor="top"
            closeButton={false}
            closeOnClick={false}
            className="site-popup"
            offset={12}
          >
            <div className="site-popup-content">
              <strong>{selectedSiteForPopup.id}</strong>
              <span>{selectedSiteForPopup.label}</span>
            </div>
          </Popup>
        )}
      </Map>

      {/* Floating zoom / reset controls */}
      <div className="map-float-controls" aria-label="Map controls">
        <button type="button" className="map-ctrl-btn" onClick={handleZoomIn} aria-label="Zoom in">
          +
        </button>
        <button type="button" className="map-ctrl-btn" onClick={handleZoomOut} aria-label="Zoom out">
          −
        </button>
        <button type="button" className="map-ctrl-btn map-ctrl-reset" onClick={handleResetView} aria-label="Reset view to Nashik">
          ⌖
        </button>
      </div>

      {/* Title / context card */}
      <div className="map-title-card" aria-hidden="true">
        <span className="section-kicker">Pilot spatial workspace</span>
        <strong>Nashik city</strong>
        <small>Demo hotspot locations · ward boundaries pending</small>
      </div>

      {/* Legend */}
      <div className="map-legend floating-legend" aria-label="Map legend">
        <span><i className="legend-dot high" /> High</span>
        <span><i className="legend-dot medium" /> Medium</span>
        <span><i className="legend-dot low" /> Low</span>
      </div>

      {/* Attribution note */}
      <div className="map-network-note" aria-hidden="true">
        Basemap: OpenFreeMap · OpenStreetMap contributors · MapLibre GL JS · no API key required
      </div>
    </div>
  );
}

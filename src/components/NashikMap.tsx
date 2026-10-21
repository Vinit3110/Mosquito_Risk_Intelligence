import { useEffect, useRef } from 'react';
import type { Site } from '../domain';

declare global {
  interface Window {
    L?: any;
  }
}

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

function ensureLeafletAssets(): Promise<void> {
  if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = LEAFLET_CSS;
    document.head.appendChild(link);
  }

  if (window.L) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Leaflet failed to load')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Leaflet failed to load'));
    document.body.appendChild(script);
  });
}

function priorityClass(priority: Site['priority']) {
  return priority.toLowerCase();
}

export function NashikMap({
  sites,
  selectedId,
  onSelect,
}: {
  sites: Site[];
  selectedId?: string;
  onSelect: (site: Site) => void;
}) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    ensureLeafletAssets().then(() => {
      if (cancelled || !mapEl.current || !window.L || mapRef.current) return;
      const L = window.L;
      const map = L.map(mapEl.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([19.9975, 73.7898], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    }).catch(() => {
      if (mapEl.current) mapEl.current.dataset.loadError = 'true';
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !layerRef.current || !window.L) return;
    const L = window.L;
    layerRef.current.clearLayers();

    sites.forEach((site) => {
      if (!site.coordinates) return;
      const marker = L.marker([site.coordinates.lat, site.coordinates.lng], {
        icon: L.divIcon({
          className: 'hotspot-marker-wrap',
          html: `<span class="hotspot-marker ${priorityClass(site.priority)} ${selectedId === site.id ? 'selected' : ''}"><span></span></span>`,
          iconSize: [34, 42],
          iconAnchor: [17, 38],
        }),
      });

      marker.bindTooltip(`<strong>${site.id}</strong><br/>${site.label}`, {
        direction: 'top',
        offset: [0, -26],
        opacity: 0.96,
      });
      marker.on('click', () => onSelect(site));
      marker.addTo(layerRef.current);
    });
  }, [sites, selectedId, onSelect]);

  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const site = sites.find((item) => item.id === selectedId);
    if (site?.coordinates) {
      mapRef.current.flyTo([site.coordinates.lat, site.coordinates.lng], Math.max(mapRef.current.getZoom(), 14), {
        duration: 0.6,
      });
    }
  }, [selectedId, sites]);

  return (
    <div className="nashik-map-shell">
      <div ref={mapEl} className="nashik-map" aria-label="Interactive map of Nashik with demo mosquito-risk hotspots" />
      <div className="map-title-card">
        <span className="section-kicker">Pilot spatial workspace</span>
        <strong>Nashik city</strong>
        <small>Demo hotspot locations · ward boundaries pending</small>
      </div>
      <div className="map-legend floating-legend">
        <span><i className="legend-dot high" /> High</span>
        <span><i className="legend-dot medium" /> Medium</span>
        <span><i className="legend-dot low" /> Low</span>
      </div>
      <div className="map-network-note">Basemap requires internet · OpenStreetMap demo tiles</div>
    </div>
  );
}

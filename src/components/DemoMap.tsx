import type { Site } from '../domain';

export function DemoMap({ sites, selectedId, onSelect }: { sites: Site[]; selectedId?: string; onSelect: (site: Site) => void }) {
  return (
    <div className="demo-map" aria-label="Demo spatial workspace">
      <div className="map-grid" aria-hidden="true" />
      <div className="map-road road-one" aria-hidden="true" />
      <div className="map-road road-two" aria-hidden="true" />
      <div className="map-block block-one" aria-hidden="true" />
      <div className="map-block block-two" aria-hidden="true" />
      <div className="map-block block-three" aria-hidden="true" />
      {sites.map((site) => (
        <button
          type="button"
          key={site.id}
          className={`map-marker marker-${site.priority.toLowerCase()} ${selectedId === site.id ? 'selected' : ''}`}
          style={{ left: `${site.mapPosition.x}%`, top: `${site.mapPosition.y}%` }}
          aria-label={`${site.id}: ${site.label}, ${site.status}`}
          onClick={() => onSelect(site)}
        >
          <span />
        </button>
      ))}
      <div className="map-overlay map-caption">
        <strong>Demo spatial canvas</strong>
        <span>MapLibre + real GeoJSON comes next</span>
      </div>
      <div className="map-overlay map-legend">
        <span><i className="legend-dot high" /> High</span>
        <span><i className="legend-dot medium" /> Medium</span>
        <span><i className="legend-dot low" /> Low</span>
      </div>
    </div>
  );
}

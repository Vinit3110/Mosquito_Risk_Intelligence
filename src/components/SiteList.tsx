import type { Site } from '../domain';
import { StatusBadge } from './StatusBadge';

export function SiteList({ sites, selectedId, onSelect }: { sites: Site[]; selectedId?: string; onSelect: (site: Site) => void }) {
  return (
    <div className="site-list" role="list" aria-label="Demo sites">
      {sites.map((site) => (
        <button
          key={site.id}
          type="button"
          className={`site-row ${selectedId === site.id ? 'selected' : ''}`}
          onClick={() => onSelect(site)}
          aria-pressed={selectedId === site.id}
          role="listitem"
        >
          <div className="site-row-top">
            <span className="site-id">{site.id}</span>
            <StatusBadge status={site.status} />
          </div>
          <strong>{site.label}</strong>
          <span className="site-meta">{site.ward} · {site.evidenceLevel}</span>
          <span className="site-reason">{site.priorityReason}</span>
        </button>
      ))}
    </div>
  );
}

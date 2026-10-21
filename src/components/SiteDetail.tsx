import { AlertTriangle, Camera, Crosshair, ExternalLink, MapPin, X } from 'lucide-react';
import type { Site } from '../domain';
import { StatusBadge } from './StatusBadge';

export function SiteDetail({ site, onClose }: { site: Site; onClose: () => void }) {
  return (
    <aside className="detail-panel" aria-label={`Details for ${site.id}`}>
      <div className="detail-head">
        <div>
          <span className="site-id">{site.id}</span>
          <h2>{site.label}</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={onClose}
          aria-label="Close site details"
        >
          <X size={18} />
        </button>
      </div>

      <div className="detail-status-row">
        <StatusBadge status={site.status} />
        <span className={`priority priority-${site.priority.toLowerCase()}`}>
          {site.priority} priority
        </span>
      </div>

      {/* Ward + coordinates */}
      <div className="detail-location-row">
        <MapPin size={13} />
        <span>{site.ward}</span>
        {site.coordinates && (
          <code className="coord-chip">
            {site.coordinates.lat.toFixed(4)}, {site.coordinates.lng.toFixed(4)}
          </code>
        )}
      </div>

      <section className="detail-section">
        <span className="section-kicker">What we currently know</span>
        <p>{site.evidenceSummary}</p>
        <small>Mosquito classification: {site.mosquitoClassification ?? 'Not recorded'}</small>
        <small className="detail-missing">Last updated: {site.updatedAt ?? 'Not supplied'} · observation time below</small>
      </section>

      <div className="detail-facts">
        <div>
          <Camera size={16} />
          <span>Classification</span>
          <strong>{site.environmentalClassification}</strong>
        </div>
        <div>
          <Crosshair size={16} />
          <span>Coordinate quality</span>
          <strong>{site.coordinateQuality}</strong>
        </div>
        <div>
          <ExternalLink size={16} />
          <span>Evidence level</span>
          <strong>{site.evidenceLevel}</strong>
        </div>
      </div>

      <section className="detail-section evidence-card">
        <div className="evidence-thumb">
          <Camera size={24} />
        </div>
        <div>
          <span className="section-kicker">Evidence</span>
          <strong>{site.source} observation</strong>
          <small>{site.observedAt}</small>
          {site.confidence !== undefined && (
            <small>Model confidence: {Math.round(site.confidence * 100)}%</small>
          )}
        </div>
      </section>

      <div className="quality-note">
        <AlertTriangle size={17} />
        <span>Demo evidence only. Confidence scores are not ground truth.</span>
      </div>

      <div className="detail-action">
        <span>Recommended next operational step</span>
        <strong>{site.nextAction}</strong>
        <button type="button" className="primary-button" disabled title="Field operations workflow is planned">
          Workflow coming soon
        </button>
      </div>
    </aside>
  );
}

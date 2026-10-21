import { AlertCircle, CheckCircle2, Clock3, SearchCheck } from 'lucide-react';
import { demoSites, recentActivity } from '../data/demoData';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';

export function OverviewPage() {
  const awaiting = demoSites.filter((site) => site.status === 'Awaiting Verification').length;
  const high = demoSites.filter((site) => site.priority === 'High').length;
  const followUp = demoSites.filter((site) => site.status === 'Follow-up Due').length;

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div><span className="eyebrow">Overview</span><h1>What needs attention now?</h1><p>One pilot-area view of verification workload, follow-up and data quality.</p></div>
        <div className="filter-chip"><span className="demo-dot" />Pilot Area · Demo dataset</div>
      </section>

      <section className="metric-grid" aria-label="Operational summary">
        <MetricCard label="Awaiting verification" value={String(awaiting)} note="Potential sites needing human review" icon={<SearchCheck size={18} />} />
        <MetricCard label="High-priority sites" value={String(high)} note="Based on demo operational reasons" icon={<AlertCircle size={18} />} />
        <MetricCard label="Follow-up due" value={String(followUp)} note="Sites requiring reassessment" icon={<Clock3 size={18} />} />
        <MetricCard label="Completed today" value="1" note="Demo intervention completion" icon={<CheckCircle2 size={18} />} />
      </section>

      <section className="overview-grid">
        <article className="panel attention-panel">
          <div className="panel-head"><div><span className="section-kicker">Operational queue</span><h2>Needs attention</h2></div><Link to="/sites" className="text-link">View all sites →</Link></div>
          <div className="queue-list">
            {demoSites.slice(0, 3).map((site, index) => (
              <Link to={`/sites?site=${site.id}`} className="queue-row" key={site.id}>
                <span className="queue-rank">0{index + 1}</span>
                <div><strong>{site.label}</strong><span>{site.priorityReason}</span></div>
                <StatusBadge status={site.status} />
              </Link>
            ))}
          </div>
        </article>

        <article className="panel quality-panel">
          <div className="panel-head"><div><span className="section-kicker">Trust & quality</span><h2>Data quality</h2></div></div>
          <div className="quality-summary"><strong>2</strong><span>records require attention</span></div>
          <div className="quality-list">
            <div><AlertCircle size={17} /><span><strong>Approximate coordinates</strong><small>SITE-B-006 should not be displayed as precise GPS.</small></span></div>
            <div><AlertCircle size={17} /><span><strong>Unverified model output</strong><small>SITE-A-018 remains machine evidence only.</small></span></div>
          </div>
        </article>
      </section>

      <section className="overview-grid lower-grid">
        <article className="panel">
          <div className="panel-head"><div><span className="section-kicker">Workflow</span><h2>Pilot loop</h2></div></div>
          <div className="workflow-strip">
            {['Detect', 'Review', 'Verify', 'Intervene', 'Follow up'].map((step, i) => <div key={step}><span>{i + 1}</span><strong>{step}</strong></div>)}
          </div>
        </article>
        <article className="panel">
          <div className="panel-head"><div><span className="section-kicker">Audit trail</span><h2>Recent activity</h2></div></div>
          <div className="activity-list">{recentActivity.map((item) => <div key={`${item.time}-${item.text}`}><time>{item.time}</time><span>{item.text}</span></div>)}</div>
        </article>
      </section>
    </div>
  );
}

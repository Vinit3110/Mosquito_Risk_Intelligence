import type { ReactNode } from 'react';

export function MetricCard({ label, value, note, icon }: { label: string; value: string; note: string; icon: ReactNode }) {
  return (
    <article className="metric-card">
      <div className="metric-head"><span>{label}</span><div className="metric-icon">{icon}</div></div>
      <strong className="metric-value">{value}</strong>
      <p>{note}</p>
    </article>
  );
}

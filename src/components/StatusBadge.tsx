import type { SiteStatus } from '../domain';

const toneByStatus: Record<SiteStatus, string> = {
  Detected: 'neutral',
  'Awaiting Verification': 'warning',
  Verified: 'success',
  'Intervention Assigned': 'info',
  'Intervention Completed': 'success',
  'Follow-up Due': 'warning',
  Reassessed: 'success',
  'Unable to Verify': 'danger',
  'No Longer Actionable': 'neutral',
  Reopened: 'danger',
};

export function StatusBadge({ status }: { status: SiteStatus }) {
  return <span className={`status-badge status-${toneByStatus[status]}`}>{status}</span>;
}

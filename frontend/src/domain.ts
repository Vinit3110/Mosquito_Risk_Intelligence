export type SiteStatus =
  | 'Detected'
  | 'Awaiting Verification'
  | 'Verified'
  | 'Intervention Assigned'
  | 'Intervention Completed'
  | 'Follow-up Due'
  | 'Reassessed'
  | 'Unable to Verify'
  | 'No Longer Actionable'
  | 'Reopened';

export type EvidenceLevel = 'E0' | 'E1' | 'E2' | 'E3' | 'E4';
export type Priority = 'High' | 'Medium' | 'Low';
export type CoordinateQuality = 'GPS' | 'Georeferenced' | 'Approximate' | 'Unknown';

export interface Site {
  id: string;
  label: string;
  ward: string;
  /** Authoritative ward identifier when supplied; demo area labels are not ward IDs. */
  wardId?: string;
  mosquitoClassification?: string;
  updatedAt?: string;
  status: SiteStatus;
  priority: Priority;
  priorityReason: string;
  environmentalClassification: string;
  evidenceLevel: EvidenceLevel;
  confidence?: number;
  observedAt: string;
  source: 'Drone' | 'LunchBox' | 'Field';
  coordinateQuality: CoordinateQuality;
  coordinates?: { lat: number; lng: number };
  evidenceSummary: string;
  nextAction: string;
  mapPosition: { x: number; y: number };
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  matching_id: string | null;
  reason: string;
  evidence: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
  // joined fields
  reporter_nickname?: string;
  reported_nickname?: string;
}

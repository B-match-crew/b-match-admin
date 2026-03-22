// v3.0 스키마 기준: public.reports
export type ReportTargetType = 'POST' | 'COMMENT' | 'MATCH' | 'HOST_NOSHOW';
export type ReportStatus = 'PENDING' | 'RESOLVED' | 'REJECTED';

export interface Report {
  id: number;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: number;
  reason: string;
  status: ReportStatus;
  created_at: string;
  // joined
  reporter?: { nickname: string; real_name: string | null } | null;
  // computed
  reporter_nickname?: string;
  target_label?: string;
}

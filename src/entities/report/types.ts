// v3.0 스키마 기준: public.reports
export type ReportTargetType = 'POST' | 'COMMENT' | 'MATCH' | 'HOST_NOSHOW';
export type ReportStatus = 'PENDING' | 'ON_HOLD' | 'RESOLVED' | 'REJECTED';

/** 분쟁 판정 5종 트랜잭션 */
export type DisputeResolutionType =
  | 'DISMISS'           // 무혐의 반려
  | 'FULL_REFUND'       // 전액 환불
  | 'PARTIAL_REFUND'    // 개별/부분 환불
  | 'WITHDRAW_INTERCEPT' // 출금 인터셉트
  | 'TRANSFER_EXEMPT';   // 송금 완료 면책

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  target_user_id?: string;
  reason: string;
  admin_note: string | null;
  status: ReportStatus;
  resolved_at: string | null;
  created_at: string;
  // joined
  reporter?: { nickname: string; real_name: string | null } | null;
  // computed
  reporter_nickname?: string;
  target_label?: string;
}

/** 피신고자 과거 신고 이력 */
export interface PastReportRecord {
  id: string;
  target_type: ReportTargetType;
  reason: string;
  status: ReportStatus;
  created_at: string;
}

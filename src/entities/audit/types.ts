// v3.0 스키마 기준: public.admin_audit_logs

export type AuditAction =
  | 'BAN_USER'
  | 'SUSPEND_USER'
  | 'UNSUSPEND_USER'
  | 'FORCE_CANCEL_MATCH'
  | 'ADJUST_BADTICKET'
  | 'APPROVE_SETTLEMENT'
  | 'COMPLETE_SETTLEMENT'
  | 'APPROVE_REFUND'
  | 'COMPLETE_REFUND'
  | 'FAIL_SETTLEMENT'
  | 'FAIL_REFUND'
  | 'RELEASE_HOLD'
  | 'DEDUCT_HOLD'
  | 'REJECT_REPORT'
  | 'EXPORT_SETTLEMENTS'
  | 'EXPORT_REFUNDS'
  // 커뮤니티 관리 (DB enum에는 없지만 앱에서 사용)
  | 'BLIND_POST'
  | 'UNBLIND_POST'
  | 'BLIND_COMMENT'
  | 'UNBLIND_COMMENT';

export type AuditTargetType =
  | 'USER'
  | 'MATCH'
  | 'SETTLEMENT'
  | 'REFUND'
  | 'REPORT'
  // 커뮤니티 관리 (DB enum에는 없지만 앱에서 사용)
  | 'POST'
  | 'COMMENT';

export interface AuditLog {
  id: string;
  admin_id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  reason: string;
  snapshot: Record<string, unknown> | null;
  created_at: string;
  // joined
  admin?: { email: string; role: string } | null;
}

// v3.0 스키마 기준: public.admin_audit_logs

export type AuditAction =
  | 'BAN_USER'
  | 'SUSPEND_USER'
  | 'FORCE_CANCEL_MATCH'
  | 'ADJUST_BADTICKET'
  | 'APPROVE_SETTLEMENT'
  | 'APPROVE_REFUND'
  | 'FAIL_SETTLEMENT'
  | 'FAIL_REFUND'
  | 'RELEASE_HOLD'
  | 'DEDUCT_HOLD';

export type AuditTargetType = 'USER' | 'MATCH' | 'SETTLEMENT' | 'REFUND';

export interface AuditLog {
  id: number;
  admin_id: string;
  action_type: AuditAction;
  target_type: AuditTargetType;
  target_id: number;
  reason: string;
  snapshot: Record<string, unknown> | null;
  created_at: string;
  // joined
  admin?: { nickname: string; real_name: string | null } | null;
}

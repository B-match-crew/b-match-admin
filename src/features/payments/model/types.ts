/**
 * 결제 관리자 화면의 값 — app migration 136(결제 코어) · 137(관리자 RPC)의 응답 모양 그대로.
 *
 * 결제 표는 PostgREST 에 노출되지 않는 `payment` 스키마에 있어 관리자도 표를 직접 읽지 못한다.
 * 조회는 `fn_admin_payment_*`(service_role) 세 개, 조치는 관리자 세션 RPC 네 개뿐이다.
 */

export const PAYMENT_STATUSES = [
  "READY",
  "APPROVING",
  "APPROVAL_UNKNOWN",
  "PAID",
  "EXPIRED",
  "FAILED",
  "REFUNDING",
  "REFUND_UNKNOWN",
  "REFUND_FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "REFUNDED_MANUAL",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface PaymentRow {
  order_no: string;
  status: PaymentStatus;
  purpose: "TEST" | "MATCH_FEE";
  pg_env: "TEST" | "LIVE";
  amount: number;
  refunded_amount: number;
  user_id: number | null;
  nickname: string | null;
  target_id: number;
  target_title: string | null;
  card_name: string | null;
  pg_auth_no: string | null;
  attempt_count: number;
  fail_code: string | null;
  created_at: string;
  approved_at: string | null;
}

export interface PaymentSearchParams {
  /** KST yyyy-MM-dd */
  dateFrom?: string;
  dateTo?: string;
  statuses?: PaymentStatus[];
  env?: "TEST" | "LIVE";
  query?: string;
  limit: number;
  offset: number;
}

export interface PaymentSearchResult {
  rows: PaymentRow[];
  total: number;
}

export interface PaymentAttempt {
  oid: string;
  status: string;
  auth_code: string | null;
  auth_message: string | null;
  pay_method: string | null;
  card_name: string | null;
  card_num_masked: string | null;
  card_quota: string | null;
  pg_trade_no: string | null;
  pg_auth_no: string | null;
  receipt_url: string | null;
  pg_pay_time_raw: string | null;
  authed_at: string | null;
  reconcile_attempts: number;
  reconcile_lease_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentEvent {
  at: string;
  oid: string | null;
  from: string | null;
  to: string | null;
  actor_type: "USER" | "SYSTEM" | "ADMIN" | "PG_WEBHOOK" | "RECONCILE";
  actor_id: number | null;
  pg_code: string | null;
  pg_message: string | null;
  detail: Record<string, unknown>;
}

export interface PaymentRefund {
  id: number;
  kind: "ORDER" | "EXTRA_APPROVAL";
  status: "REQUESTED" | "DONE" | "FAILED" | "UNKNOWN" | "MANUAL_DONE";
  amount: number;
  reason_code: string;
  reason_text: string | null;
  requested_by_type: "USER" | "SYSTEM" | "ADMIN";
  requested_by_id: number | null;
  oid: string | null;
  attempts: number;
  pg_code: string | null;
  pg_message: string | null;
  lease_until: string | null;
  created_at: string;
  done_at: string | null;
}

export interface PaymentAlert {
  kind: string;
  detail: Record<string, unknown>;
  created_at: string;
  sent_at: string | null;
  order_no?: string | null;
}

export interface PaymentDetail {
  order: {
    order_no: string;
    status: PaymentStatus;
    purpose: string;
    amount: number;
    goods_name: string;
    pg_env: "TEST" | "LIVE";
    expires_at: string | null;
    approved_at: string | null;
    refunded_amount: number;
    refunded_at: string | null;
    created_at: string;
    user_id: number | null;
    payer: { nickname?: string };
    target_type: string;
    target_id: number;
    target: { title?: string; start_time?: string; location_name?: string };
    fail_code: string | null;
    fail_message: string | null;
    approved_oid: string | null;
    user_nickname_now: string | null;
    user_deleted: boolean | null;
  };
  attempts: PaymentAttempt[];
  events: PaymentEvent[];
  refunds: PaymentRefund[];
  alerts: PaymentAlert[];
}

export interface PaymentOverview {
  queue: {
    approval_unknown: number;
    approving_stale: number;
    refund_unknown: number;
    refund_failed: number;
    refunding: number;
    extra_refund_open: number;
    old_ready: number;
    alerts_unsent: number;
  };
  funnel: {
    orders: number;
    opened: number;
    authed: number;
    paid: number;
    refunded: number;
    amount_paid: number;
    amount_refunded: number;
  };
  attempts: Record<string, number>;
  settings: {
    payments_enabled: boolean;
    pg_env: "TEST" | "LIVE";
    test_amount: number;
    max_amount: number;
    order_ttl_minutes: number;
    attempt_limit_10m: number;
    attempt_limit_day: number;
    test_attempt_limit_10m: number;
    fail_streak_limit: number;
    fail_block_minutes: number;
    admin_refund_daily_count: number;
    admin_refund_daily_amount: number;
    client_key_set: boolean;
    rst_url: string | null;
    checkout_origin: string | null;
  };
  recent_alerts: PaymentAlert[];
}

export interface PaymentSettingsInput {
  paymentsEnabled?: boolean;
  testAmount?: number;
  maxAmount?: number;
  reason: string;
}

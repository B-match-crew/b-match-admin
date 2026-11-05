/** 정산(app migration 138) 응답 모양 — fn_admin_payout_overview · fn_admin_settlement_detail · Edge /balance. */

export type PayoutStatus =
  | "SCHEDULED"
  | "HELD"
  | "REQUESTED"
  | "EXECUTING"
  | "PROCESSING"
  | "PAID_OUT"
  | "FAILED_ACCOUNT"
  | "FAILED"
  | "CANCELED";

export type SettlementStatus = "DRAFT" | "APPROVED" | "CARRIED" | "CANCELED";

/** UNCERTAIN = 이체 대기 요청의 답을 모른다(app migration 139) — 페이플에 대기가 생겼을 수 있다. */
export type HoldReason =
  | "NO_ACCOUNT"
  | "INSUFFICIENT_BALANCE"
  | "DISPUTE"
  | "ACCOUNT_RESTRICTED"
  | "MANUAL"
  | "UNCERTAIN";

/** provisional = true 면 결정(D13 · D14 · D15 · D16 · P18) 전의 임시 기본값이다. */
export interface PayoutPolicy {
  provisional: boolean;
  platform_fee_bp: number;
  hold_days: number;
  withholding_mode: string;
  restricted_host_policy: string;
  approval_mode: string;
  decisions: Record<string, string>;
}

export interface Payout {
  id: number;
  settlement_id: number;
  host_user_id: number | null;
  pg_env: "TEST" | "LIVE";
  net_amount: number;
  tran_amount: number;
  status: PayoutStatus;
  hold_reason: HoldReason | null;
  distinct_key: string;
  group_key: string | null;
  api_tran_id: string | null;
  pg_code: string | null;
  pg_message: string | null;
  attempts: number;
  next_try_at: string | null;
  /** 139 — 집혀서 잡이 쥐고 있는 동안(보류 · 해제 불가). 138 DB 에는 없다. */
  lease_until?: string | null;
  /** 139 — 이체 대기 요청을 보냈을 수 있다(답이 오면 지운다). 138 DB 에는 없다. */
  request_inflight_at?: string | null;
  /** 143 — 관리자가 넣은 group_key 후보(결과 불명 보류의 자동 확인이 대기 목록에서 검증한다). 142 이하 DB 에는 없다. */
  recover_group_key?: string | null;
  retry_of_id: number | null;
  requested_at: string | null;
  executed_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettlementRow {
  id: number;
  status: SettlementStatus;
  host_user_id: number | null;
  host_nickname: string | null;
  gross_amount: number;
  refund_deduction: number;
  carry_in: number;
  fee_amount: number;
  net_amount: number;
  ignored_hold: boolean;
  created_at: string;
  approved_at: string | null;
  item_count: number;
  payout_status: PayoutStatus | null;
}

export interface PayoutOverview {
  pg_env: "TEST" | "LIVE";
  enabled: boolean;
  policy: PayoutPolicy;
  counts: Partial<Record<PayoutStatus, number>>;
  drafts: number;
  accounts: number;
  /** 142 부터 개요에서 뺐다(누적 결제를 훑는 집계) — fetchPendingPayments 로 따로. 138 · 139 DB 에만 있다. */
  pending_payments?: number;
  settlements: SettlementRow[];
  payouts: Payout[];
  webhooks: Array<{
    id: number;
    distinct_key: string | null;
    result: string | null;
    match_result: string | null;
    received_at: string;
  }>;
  /** 139 — 결과 불명 보류 수 · 정산 경보(PAYOUT_*) 최근 30건. 138 DB 에는 없다. */
  uncertain?: number;
  alerts?: PayoutAlert[];
}

export interface PayoutAlert {
  id: number;
  kind: string;
  detail: Record<string, unknown>;
  created_at: string;
  sent_at: string | null;
}

export interface SettlementDetail {
  settlement: SettlementRow & {
    pg_env: "TEST" | "LIVE";
    fee_bp: number;
    withholding_amount: number;
    policy_snapshot: PayoutPolicy;
    cutoff_at: string;
    canceled_at: string | null;
    host_snapshot: { nickname?: string };
  };
  items: Array<{
    kind: "PAYMENT" | "REFUND";
    amount: number;
    order_no: string;
    payment_status: string;
    target_id: number;
    approved_at: string | null;
  }>;
  payouts: Payout[];
  events: Array<{
    payout_id: number | null;
    from: string | null;
    to: string | null;
    actor: string;
    pg_code: string | null;
    pg_message: string | null;
    detail: Record<string, unknown>;
    created_at: string;
  }>;
  account: {
    bank_name: string | null;
    account_masked: string;
    holder_name: string;
    name_check: "MATCHED" | "SKIPPED_TEST";
    verified_at: string;
  } | null;
}

export interface PayoutBalance {
  result: string | null;
  message?: string | null;
  remain_amt?: string | null;
  total_account_amt?: string | null;
  total_transfer_amt?: string | null;
  pg_env: "TEST" | "LIVE";
  via_proxy: boolean;
}

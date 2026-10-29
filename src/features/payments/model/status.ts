import type { PaymentDetail, PaymentOverview, PaymentStatus } from "./types";

/** 상태 → 운영자 표기 · 톤(결제 계획서 §3.1). */
export const PAYMENT_STATUS_META: Record<
  PaymentStatus,
  { label: string; tone: "positive" | "warning" | "danger" | "info" | "neutral" }
> = {
  READY: { label: "결제 대기", tone: "neutral" },
  APPROVING: { label: "승인 중", tone: "info" },
  APPROVAL_UNKNOWN: { label: "승인 결과 모름", tone: "warning" },
  PAID: { label: "결제 완료", tone: "positive" },
  EXPIRED: { label: "만료", tone: "neutral" },
  FAILED: { label: "실패", tone: "danger" },
  REFUNDING: { label: "환불 중", tone: "info" },
  REFUND_UNKNOWN: { label: "환불 결과 모름", tone: "warning" },
  REFUND_FAILED: { label: "환불 실패", tone: "danger" },
  REFUNDED: { label: "환불 완료", tone: "neutral" },
  PARTIALLY_REFUNDED: { label: "부분 환불", tone: "neutral" },
  REFUNDED_MANUAL: { label: "수기 환불", tone: "neutral" },
};

export function paymentStatusMeta(status: string) {
  return (
    PAYMENT_STATUS_META[status as PaymentStatus] ?? { label: status, tone: "neutral" as const }
  );
}

/** 강제 환불을 걸 수 있는가 — 서버(fn_admin_payment_refund)가 다시 본다. */
export function canForceRefund(order: Pick<PaymentDetail["order"], "status" | "amount" | "refunded_amount">) {
  return (
    (order.status === "PAID" || order.status === "PARTIALLY_REFUNDED") &&
    order.amount - order.refunded_amount > 0
  );
}

/** 환불 재시도를 걸 수 있는가. */
export function canRetryRefund(order: Pick<PaymentDetail["order"], "status">) {
  return order.status === "REFUND_FAILED";
}

/** 상태 재조회가 의미 있는가 — 결과 모름(승인 · 환불)일 때만 reconcile 이 다시 묻는다. */
export function canRecheck(order: Pick<PaymentDetail["order"], "status">) {
  return order.status === "APPROVAL_UNKNOWN" || order.status === "REFUND_UNKNOWN";
}

/** 운영 큐에서 사람이 봐야 하는 건수(기대값 0 — 결제 계획서 §8.3). */
export function queueAttention(q: PaymentOverview["queue"]): number {
  return (
    q.approval_unknown +
    q.approving_stale +
    q.refund_unknown +
    q.refund_failed +
    q.extra_refund_open +
    q.old_ready
  );
}

/**
 * 조치 요청 키 — 같은 다이얼로그에서 다시 눌러도(연타 · 타임아웃 뒤 재시도) 같은 요청으로 묶인다.
 * 서버 형식 `^[A-Za-z0-9_-]{8,100}$`.
 */
export function newRequestKey(prefix: string): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${prefix.replace(/[^A-Za-z0-9_-]/g, "")}-${hex}`.slice(0, 100);
}

/** 금액 표기(1,000원). */
export function won(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

/** 경보 종류 → 운영자 문구(Edge payple 의 Slack 문구와 같은 말). */
export const ALERT_LABELS: Record<string, string> = {
  NONCE_MISMATCH: "위조 의심 결과 POST",
  ENV_MISMATCH: "환경 불일치",
  AMOUNT_MISMATCH: "금액 불일치 — 승인 안 함",
  PAYER_MISMATCH: "결제자 불일치 — 승인 안 함",
  APPROVAL_UNKNOWN: "승인 결과 모름",
  UNKNOWN_STUCK: "30분 넘게 승인 결과를 못 정함",
  LATE_CONFIRM: "늦은 확정",
  DOUBLE_APPROVAL: "이중 승인 — 자동 환불",
  LATE_AFTER_REPAY: "재결제 뒤 늦은 승인 — 자동 환불",
  APPROVED_AMOUNT_MISMATCH: "승인 금액이 주문과 다름",
  APPROVAL_AFTER_FINAL: "끝난 시도에 승인 응답",
  UNEXPECTED_APPROVAL: "환불 상태 주문에 승인",
  APPROVAL_DECLINED_SYSTEM: "설정 · 한도 문제로 승인 거절",
  REFUND_FAILED: "환불 실패",
  REFUND_STUCK: "환불 10번 넘게 미완료",
  RATE_LIMITED: "시도 횟수 제한",
  FAIL_BLOCKED: "연속 실패 차단",
  ADMIN_REFUND: "관리자 강제 환불",
  KILL_SWITCH_ON: "킬 스위치 켜짐",
};

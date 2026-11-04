import type {
  HoldReason,
  Payout,
  PayoutBalance,
  PayoutOverview,
  PayoutPolicy,
  PayoutStatus,
  SettlementStatus,
} from "./types";

type Tone = "positive" | "warning" | "danger" | "info" | "neutral";

/** 지급 상태 → 운영자 표기 · 톤(결제 계획서 §12.4). */
export const PAYOUT_STATUS_META: Record<PayoutStatus, { label: string; tone: Tone }> = {
  SCHEDULED: { label: "지급 대기", tone: "info" },
  HELD: { label: "보류", tone: "warning" },
  REQUESTED: { label: "이체 대기 등록", tone: "info" },
  EXECUTING: { label: "이체 실행 중", tone: "info" },
  PROCESSING: { label: "은행 처리 중", tone: "warning" },
  PAID_OUT: { label: "지급 완료", tone: "positive" },
  FAILED_ACCOUNT: { label: "계좌 문제로 실패", tone: "danger" },
  FAILED: { label: "실패", tone: "danger" },
  CANCELED: { label: "취소", tone: "neutral" },
};

export const SETTLEMENT_STATUS_META: Record<SettlementStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "승인 대기", tone: "warning" },
  APPROVED: { label: "승인됨", tone: "positive" },
  CARRIED: { label: "이월(0원 이하)", tone: "neutral" },
  CANCELED: { label: "취소", tone: "neutral" },
};

export const HOLD_REASON_LABELS: Record<HoldReason, string> = {
  NO_ACCOUNT: "정산 계좌 없음",
  INSUFFICIENT_BALANCE: "이체 가능 잔액 부족(다음 날 07:30 자동 재시도)",
  DISPUTE: "분쟁",
  ACCOUNT_RESTRICTED: "모임장 정지 · 탈퇴",
  MANUAL: "운영자 보류",
  UNCERTAIN: "결과 불명 — 페이플 확인 필요",
};

/** 🔴 = 돈이 두 번 나갔거나 우리가 모르는 돈이 나갔을 수 있다 — 사람이 바로 본다. */
export const PAYOUT_ALERT_LABELS: Record<string, string> = {
  PAYOUT_REQUEST_UNCERTAIN: "🔴 이체 대기 요청 결과 불명 — 페이플에서 대기 · 이체 확인 후 해제",
  PAYOUT_UNEXPECTED_RESULT: "🔴 보내기 전 상태의 지급에 페이플 결과가 옴",
  PAYOUT_DOUBLE_RISK: "🔴 이중 지급 위험",
  PAYOUT_LATE_PAID: "🔴 끝난 지급의 늦은 성공",
  PAYOUT_WEBHOOK_ERROR: "🔴 웹훅 반영 실패(기록은 남음)",
  PAYOUT_WEBHOOK_UNMATCHED: "우리가 모르는 이체의 웹훅",
  PAYOUT_WEBHOOK_UNVERIFIED: "웹훅을 페이플 조회로 확인하지 못함",
  PAYOUT_RESULT_KEY_MISMATCH: "결과 조회가 다른 이체를 가리킴",
  PAYOUT_RESULT_UNKNOWN_CODE: "모르는 결과 코드 — 실패로 보지 않고 대기",
  PAYOUT_EXECUTE_NO_PENDING: "실행했더니 대기가 없음(R0142 · R0144) — 결과 조회로",
  PAYOUT_EXECUTE_BALANCE: "실행 단계 잔액 부족 — 대기는 남김",
  PAYOUT_EXECUTE_UNKNOWN_CODE: "실행 응답 코드를 모름 — 다시 실행",
  PAYOUT_VERIFY_LIMIT: "계좌조회 하루 한도",
  PAYOUT_RESULT_LATE: "이체 결과 2시간+ 없음",
  PAYOUT_RETRY_MANY: "지급 재시도 10회+",
  PAYOUT_INSUFFICIENT_BALANCE: "이체 가능 잔액 부족",
  PAYOUT_FAILED_ACCOUNT: "계좌 문제로 지급 실패",
  PAYOUT_FAILED: "지급 실패",
  PAYOUT_CANCELED: "지급 취소",
  PAYOUT_HUB_IP: "등록 안 된 IP(T0310) — 프록시 · White IP",
  PAYOUT_HUB_KEY: "Hub 키 오류",
  PAYOUT_HUB_CONTRACT: "정산 서비스 미승인",
  PAYOUT_HUB_AUTH: "Hub 인증 단계 거절",
  PAYOUT_HUB_WEBHOOK_URL: "웹훅 주소 문제",
  PAYOUT_ENV_MISMATCH: "지급 환경과 Edge 키 환경이 다름",
  // 139 이전 Edge(v2)가 남긴 경보 — 기록 표시용
  PAYOUT_HUB_DUPLICATE_REQUEST: "중복 이체 대기(R0145) — 수동 확인(이전 버전)",
  PAYOUT_HUB_BAD_RESPONSE: "이체 대기 응답 이상(이전 버전)",
};

export function alertLabel(kind: string): string {
  return PAYOUT_ALERT_LABELS[kind] ?? kind;
}

export function isUrgentAlert(kind: string): boolean {
  return alertLabel(kind).startsWith("🔴");
}

/** 경보 · 이력 detail 에서 사람이 읽을 것만 — 지급 번호 · 사유 · 코드. */
export function detailSummary(detail: Record<string, unknown> | null | undefined): string {
  if (!detail) return "";
  const keys = ["payout_id", "reason", "code", "verify", "result", "from", "to", "hold_reason", "released_from",
    "released_by", "sqlstate", "defer_sec"];
  return keys
    .filter((k) => detail[k] != null && detail[k] !== "" && detail[k] !== false)
    .map((k) => `${k}=${String(detail[k])}`)
    .join(" · ");
}

export function payoutStatusMeta(status: string) {
  return PAYOUT_STATUS_META[status as PayoutStatus] ?? { label: status, tone: "neutral" as const };
}

export function settlementStatusMeta(status: string) {
  return SETTLEMENT_STATUS_META[status as SettlementStatus] ?? { label: status, tone: "neutral" as const };
}

export function won(n: number | null | undefined): string {
  return n == null ? "-" : `${n.toLocaleString("ko-KR")}원`;
}

/** 10000 분율 → "3.5%". */
export function formatBp(bp: number): string {
  return `${(bp / 100).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}%`;
}

const WITHHOLDING_LABELS: Record<string, string> = { NONE: "계산 안 함" };
const RESTRICTED_LABELS: Record<string, string> = { HOLD: "지급 보류" };
const APPROVAL_LABELS: Record<string, string> = { MANUAL: "관리자가 회차를 만들고 하나씩 승인" };

/**
 * 정책 표 — 화면에 그대로 그린다. provisional 이면 모든 줄에 "임시" 와 결정 번호를 붙인다
 * (결정 전 값으로 돈이 나가고 있다는 것을 운영자가 잊지 않게).
 */
export function policyRows(p: PayoutPolicy): Array<{ label: string; value: string; decision: string | null }> {
  const d = (k: string) => (p.provisional ? (p.decisions[k] ?? null) : null);
  return [
    { label: "플랫폼 수수료", value: formatBp(p.platform_fee_bp), decision: d("platform_fee_bp") },
    { label: "정산 보류 기간", value: `경기 종료 + ${p.hold_days}일`, decision: d("hold_days") },
    {
      label: "원천징수",
      value: WITHHOLDING_LABELS[p.withholding_mode] ?? p.withholding_mode,
      decision: d("withholding_mode"),
    },
    {
      label: "정지 · 탈퇴 모임장",
      value: RESTRICTED_LABELS[p.restricted_host_policy] ?? p.restricted_host_policy,
      decision: d("restricted_host_policy"),
    },
    {
      label: "회차 확정",
      value: APPROVAL_LABELS[p.approval_mode] ?? p.approval_mode,
      decision: d("approval_mode"),
    },
  ];
}

/** 사람이 봐야 하는 지급 수 — 보류 · 실패 · 은행 처리 중. */
export function payoutAttention(counts: PayoutOverview["counts"]): number {
  return (counts.HELD ?? 0) + (counts.FAILED ?? 0) + (counts.FAILED_ACCOUNT ?? 0) + (counts.PROCESSING ?? 0);
}

/**
 * 조치 가능 여부 — 서버가 다시 본다. 보류는 페이플에 보내기 전(SCHEDULED · HELD)만, 잡이 쥐고 있지 않고
 * 보냈을 수 있는 표시가 없을 때만(139). 결과 불명은 운영자 보류로 덮지 않는다.
 */
export function canHold(
  p: Pick<Payout, "status" | "hold_reason" | "lease_until" | "request_inflight_at">,
  now: number = Date.now()
): boolean {
  if (p.status !== "SCHEDULED" && p.status !== "HELD") return false;
  if (p.lease_until && Date.parse(p.lease_until) > now) return false;
  if (p.request_inflight_at) return false;
  return p.hold_reason !== "UNCERTAIN";
}

/**
 * 해제 경고. 해제하면 1분 안에 실제 이체가 시작된다. 결과 불명은 같은 키로 다시 요청되므로 페이플에 대기가
 * 남아 있으면 둘 다 나간다 — 확인 순서를 보인다.
 */
export function releaseWarning(p: Pick<Payout, "hold_reason">): "uncertain" | "transfer" {
  return p.hold_reason === "UNCERTAIN" ? "uncertain" : "transfer";
}

/** 잔액 조회 결과 — 성공(A0000)이 아니면 금액을 숫자로 보이지 않는다(오류를 0원으로 읽지 않게). */
export function balanceAmount(b: Pick<PayoutBalance, "result" | "remain_amt">): number | null {
  if (b.result !== "A0000") return null;
  const n = Number(b.remain_amt);
  return Number.isFinite(n) ? n : null;
}

export function canRelease(p: Pick<Payout, "status">): boolean {
  return p.status === "HELD";
}

/** 재시도는 앞 건이 끝났고(실패 · 취소) 같은 회차에 진행 중이거나 지급된 건이 없을 때. */
export function canRetry(p: Pick<Payout, "id" | "status">, siblings: Array<Pick<Payout, "id" | "status">>): boolean {
  const ended = p.status === "FAILED" || p.status === "FAILED_ACCOUNT" || p.status === "CANCELED";
  const blocked = siblings.some(
    (s) => s.id !== p.id && !(s.status === "FAILED" || s.status === "FAILED_ACCOUNT" || s.status === "CANCELED")
  );
  return ended && !blocked;
}

/**
 * 회차 만들기 결과 → 토스트. 아무것도 안 만들어졌으면 **왜인지** 말한다 — "0건" 성공 토스트는
 * 버튼이 고장 난 것처럼 읽혔다(2026-11-03, dev 의 PAID 결제가 전부 이미 회차에 들어가 있었다).
 */
export function buildResultMessage(
  r: { created: number; carried: number; skipped: number },
  ignoreHold: boolean
): { tone: "success" | "info"; text: string } {
  const skipped = r.skipped > 0 ? ` · 건너뜀 ${r.skipped}건(승인 대기 회차가 이미 있음 — 그 회차를 먼저 승인하거나 취소)` : "";
  if (r.created === 0 && r.carried === 0) {
    if (r.skipped > 0) return { tone: "info", text: `새 회차가 없습니다${skipped}` };
    return {
      tone: "info",
      text: ignoreHold
        ? "회차에 넣을 결제가 없습니다 — 아직 회차에 안 들어간 결제 완료(PAID) 건이 없습니다"
        : "회차에 넣을 결제가 없습니다 — 경기 종료 + 보류 기간이 지난 결제가 없습니다(TEST 는 '보류 기간 무시'로 만들 수 있습니다)",
    };
  }
  return { tone: "success", text: `승인 대기 ${r.created}건 · 이월 ${r.carried}건${skipped}` };
}

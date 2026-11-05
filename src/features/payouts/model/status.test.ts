import { describe, expect, it } from "vitest";
import {
  alertLabel,
  balanceAmount,
  buildResultMessage,
  canHold,
  canRelease,
  canRetry,
  canSetGroupKey,
  detailSummary,
  GROUP_KEY_RE,
  uncertainState,
  formatBp,
  isUrgentAlert,
  payoutAttention,
  policyRows,
  releaseWarning,
  won,
} from "./status";
import type { PayoutPolicy } from "./types";

const POLICY: PayoutPolicy = {
  provisional: true,
  platform_fee_bp: 0,
  hold_days: 3,
  withholding_mode: "NONE",
  restricted_host_policy: "HOLD",
  approval_mode: "MANUAL",
  decisions: {
    platform_fee_bp: "D14",
    hold_days: "D15",
    withholding_mode: "D13",
    restricted_host_policy: "D16",
    approval_mode: "P18",
  },
};

describe("policyRows — 임시 기본값 표시", () => {
  it("임시면 줄마다 결정 번호가 붙는다", () => {
    const rows = policyRows(POLICY);
    expect(rows.map((r) => r.decision)).toEqual(["D14", "D15", "D13", "D16", "P18"]);
    expect(rows[0].value).toBe("0%");
    expect(rows[1].value).toBe("경기 종료 + 3일");
    expect(rows[2].value).toBe("계산 안 함");
  });

  it("확정되면 결정 번호를 지운다", () => {
    expect(policyRows({ ...POLICY, provisional: false }).every((r) => r.decision === null)).toBe(true);
  });
});

describe("formatBp · won", () => {
  it("10000 분율을 % 로", () => {
    expect(formatBp(0)).toBe("0%");
    expect(formatBp(350)).toBe("3.5%");
    expect(formatBp(1000)).toBe("10%");
  });
  it("원 표기", () => {
    expect(won(1000)).toBe("1,000원");
    expect(won(-1000)).toBe("-1,000원");
    expect(won(null)).toBe("-");
  });
});

describe("조치 가능 여부", () => {
  const base = { hold_reason: null, lease_until: null, request_inflight_at: null } as const;

  it("보류는 보내기 전만, 해제는 보류만", () => {
    expect(canHold({ ...base, status: "SCHEDULED" })).toBe(true);
    expect(canHold({ ...base, status: "HELD", hold_reason: "NO_ACCOUNT" })).toBe(true);
    expect(canHold({ ...base, status: "REQUESTED" })).toBe(false);
    expect(canRelease({ status: "HELD" })).toBe(true);
    expect(canRelease({ status: "SCHEDULED" })).toBe(false);
  });

  it("🔴 보냈을 수 있는 지급 · 결과 불명 · 잡이 쥔 지급은 보류(운영자)로 덮지 않는다", () => {
    const now = Date.parse("2026-11-04T03:00:00Z");
    expect(canHold({ ...base, status: "SCHEDULED", request_inflight_at: "2026-11-04T02:59:00Z" }, now)).toBe(false);
    expect(canHold({ ...base, status: "HELD", hold_reason: "UNCERTAIN" }, now)).toBe(false);
    expect(canHold({ ...base, status: "SCHEDULED", lease_until: "2026-11-04T03:01:00Z" }, now)).toBe(false);
    expect(canHold({ ...base, status: "SCHEDULED", lease_until: "2026-11-04T02:59:00Z" }, now)).toBe(true);
    // 138 DB(필드 없음)에서도 그대로 동작한다
    expect(canHold({ status: "SCHEDULED", hold_reason: null })).toBe(true);
  });

  it("해제 경고 — 결과 불명이면 이중 지급 경고, 아니면 이체 시작 경고", () => {
    expect(releaseWarning({ hold_reason: "UNCERTAIN" })).toBe("uncertain");
    expect(releaseWarning({ hold_reason: "INSUFFICIENT_BALANCE" })).toBe("transfer");
    expect(releaseWarning({ hold_reason: null })).toBe("transfer");
  });

  it("재시도는 끝난 건이고, 같은 회차에 진행 중 · 지급된 건이 없을 때만", () => {
    const failed = { id: 1, status: "FAILED_ACCOUNT" as const };
    expect(canRetry(failed, [failed])).toBe(true);
    expect(canRetry(failed, [failed, { id: 2, status: "HELD" }])).toBe(false);
    expect(canRetry(failed, [failed, { id: 2, status: "PAID_OUT" }])).toBe(false);
    expect(canRetry(failed, [failed, { id: 2, status: "CANCELED" }])).toBe(true);
    expect(canRetry({ id: 3, status: "PAID_OUT" }, [])).toBe(false);
  });

  it("주의 수 — 보류 · 실패 · 은행 처리 중", () => {
    expect(payoutAttention({ HELD: 1, FAILED: 2, FAILED_ACCOUNT: 1, PROCESSING: 1, PAID_OUT: 9 })).toBe(5);
    expect(payoutAttention({})).toBe(0);
  });
});

describe("결과 불명 보류(143)", () => {
  const u = { status: "HELD" as const, hold_reason: "UNCERTAIN" as const, lease_until: null, pg_code: null, recover_group_key: null };

  it("단계 — 자동 확인 · R0132(group_key 필요) · 입력한 group_key 확인 중", () => {
    expect(uncertainState(u)).toBe("AUTO");
    expect(uncertainState({ ...u, pg_code: "R0132" })).toBe("NEEDS_GROUP_KEY");
    expect(uncertainState({ ...u, pg_code: "R0132", recover_group_key: "GKADMIN0001" })).toBe("CHECKING_GROUP_KEY");
    expect(uncertainState({ ...u, hold_reason: "MANUAL" })).toBeNull();
  });

  it("그룹키 입력은 결과 불명 보류 · 잡이 쥐지 않을 때만", () => {
    const now = Date.parse("2026-11-05T03:00:00Z");
    expect(canSetGroupKey(u, now)).toBe(true);
    expect(canSetGroupKey({ ...u, lease_until: "2026-11-05T03:01:00Z" }, now)).toBe(false);
    expect(canSetGroupKey({ ...u, hold_reason: "NO_ACCOUNT" }, now)).toBe(false);
    expect(canSetGroupKey({ ...u, status: "SCHEDULED" }, now)).toBe(false);
  });

  it("group_key 형식 — 서버와 같다(영문 · 숫자 · +/=_.- 8~64자)", () => {
    expect(GROUP_KEY_RE.test("QlJKZDZrNVBzbW9Yc1UzTWNIdW05dz09")).toBe(true);
    expect(GROUP_KEY_RE.test("short")).toBe(false);
    expect(GROUP_KEY_RE.test("bad key!")).toBe(false);
  });
});

describe("경보 · 잔액 표시", () => {
  it("경보 라벨 — 모르는 종류는 원문, 돈이 걸린 경보는 🔴", () => {
    expect(alertLabel("PAYOUT_REQUEST_UNCERTAIN")).toContain("결과 불명");
    expect(alertLabel("PAYOUT_NEW_KIND")).toBe("PAYOUT_NEW_KIND");
    // 143 부터 결과 불명은 자동 확인 — 긴급은 사람이 group_key 를 넣어야 할 때
    expect(isUrgentAlert("PAYOUT_REQUEST_UNCERTAIN")).toBe(false);
    expect(isUrgentAlert("PAYOUT_PENDING_NEEDS_GROUP_KEY")).toBe(true);
    expect(isUrgentAlert("PAYOUT_DOUBLE_RISK")).toBe(true);
    expect(isUrgentAlert("PAYOUT_WEBHOOK_ERROR")).toBe(true);
    expect(isUrgentAlert("PAYOUT_VERIFY_LIMIT")).toBe(false);
  });

  it("detail 요약 — 아는 키만, 빈 값은 빼고", () => {
    expect(detailSummary({ payout_id: 7, reason: "REQUEST_TIMEOUT", code: null, request_cleared: false, x: 1 })).toBe(
      "payout_id=7 · reason=REQUEST_TIMEOUT"
    );
    expect(detailSummary(null)).toBe("");
  });

  it("🔴 잔액 조회가 실패하면 0원이 아니라 null(조회 실패)", () => {
    expect(balanceAmount({ result: "A0000", remain_amt: "800000" })).toBe(800000);
    expect(balanceAmount({ result: "T0310", remain_amt: null })).toBeNull();
    expect(balanceAmount({ result: "NETWORK" })).toBeNull();
    expect(balanceAmount({ result: "A0000", remain_amt: "abc" })).toBeNull();
  });
});

describe("buildResultMessage — 회차 만들기 결과", () => {
  it("만들어졌으면 성공 · 수를 보인다", () => {
    expect(buildResultMessage({ created: 1, carried: 0, skipped: 0 }, true)).toEqual({
      tone: "success",
      text: "승인 대기 1건 · 이월 0건",
    });
  });

  it("아무것도 없으면 이유를 말한다 — 보류 무시 여부에 따라", () => {
    const a = buildResultMessage({ created: 0, carried: 0, skipped: 0 }, true);
    const b = buildResultMessage({ created: 0, carried: 0, skipped: 0 }, false);
    expect(a.tone).toBe("info");
    expect(a.text).toContain("아직 회차에 안 들어간");
    expect(b.text).toContain("보류 기간");
  });

  it("승인 대기 회차 때문에 건너뛰었으면 그렇게 말한다", () => {
    const m = buildResultMessage({ created: 0, carried: 0, skipped: 2 }, true);
    expect(m.tone).toBe("info");
    expect(m.text).toContain("건너뜀 2건");
  });
});

import { describe, expect, it } from "vitest";
import { canHold, canRelease, canRetry, formatBp, payoutAttention, policyRows, won } from "./status";
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
  it("보류는 보내기 전만, 해제는 보류만", () => {
    expect(canHold({ status: "SCHEDULED" })).toBe(true);
    expect(canHold({ status: "HELD" })).toBe(true);
    expect(canHold({ status: "REQUESTED" })).toBe(false);
    expect(canRelease({ status: "HELD" })).toBe(true);
    expect(canRelease({ status: "SCHEDULED" })).toBe(false);
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

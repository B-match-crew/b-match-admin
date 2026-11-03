import { describe, expect, it } from "vitest";
import { buildResultMessage, canHold, canRelease, canRetry, formatBp, payoutAttention, policyRows, won } from "./status";
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

import { describe, expect, it } from "vitest";
import {
  canForceRefund,
  canRecheck,
  canRetryRefund,
  newRequestKey,
  paymentStatusMeta,
  queueAttention,
  won,
} from "./status";
import { PAYMENT_STATUSES } from "./types";

describe("결제 상태 표기", () => {
  it("서버의 상태 12개에 전부 표기가 있다", () => {
    for (const s of PAYMENT_STATUSES) expect(paymentStatusMeta(s).label).not.toBe(s);
  });
  it("모르는 상태는 그대로 보여 준다(서버가 먼저 바뀔 수 있다)", () => {
    expect(paymentStatusMeta("NEW_STATE")).toEqual({ label: "NEW_STATE", tone: "neutral" });
  });
});

describe("조치 가능 판정 — 서버가 다시 본다", () => {
  it("강제 환불은 결제됨 · 부분 환불이고 남은 금액이 있을 때만", () => {
    expect(canForceRefund({ status: "PAID", amount: 1000, refunded_amount: 0 })).toBe(true);
    expect(canForceRefund({ status: "PARTIALLY_REFUNDED", amount: 1000, refunded_amount: 400 })).toBe(true);
    expect(canForceRefund({ status: "PAID", amount: 1000, refunded_amount: 1000 })).toBe(false);
    expect(canForceRefund({ status: "REFUNDING", amount: 1000, refunded_amount: 0 })).toBe(false);
    expect(canForceRefund({ status: "APPROVAL_UNKNOWN", amount: 1000, refunded_amount: 0 })).toBe(false);
  });
  it("재시도는 환불 실패만 · 재조회는 결과 모름만", () => {
    expect(canRetryRefund({ status: "REFUND_FAILED" })).toBe(true);
    expect(canRetryRefund({ status: "REFUNDING" })).toBe(false);
    expect(canRecheck({ status: "APPROVAL_UNKNOWN" })).toBe(true);
    expect(canRecheck({ status: "REFUND_UNKNOWN" })).toBe(true);
    expect(canRecheck({ status: "PAID" })).toBe(false);
  });
});

describe("운영 큐", () => {
  it("사람이 봐야 하는 건만 센다(환불 중 · 안 보낸 경보는 흐르는 중이라 빼다)", () => {
    expect(
      queueAttention({
        approval_unknown: 1,
        approving_stale: 2,
        refund_unknown: 3,
        refund_failed: 4,
        refunding: 100,
        extra_refund_open: 5,
        old_ready: 6,
        alerts_unsent: 100,
      })
    ).toBe(21);
  });
});

describe("요청 키", () => {
  it("서버 형식(8~100자 영숫자 · - · _)이고 매번 다르다", () => {
    const a = newRequestKey("admin refund!");
    const b = newRequestKey("admin refund!");
    expect(a).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
    expect(a).not.toBe(b);
    expect(a.startsWith("adminrefund-")).toBe(true);
  });
});

describe("금액", () => {
  it("천 단위 쉼표 + 원", () => {
    expect(won(1000)).toBe("1,000원");
    expect(won(0)).toBe("0원");
  });
});

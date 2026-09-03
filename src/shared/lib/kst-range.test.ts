import { afterEach, describe, expect, it, vi } from "vitest";
import { kstRange, kstToday } from "./kst-range";

/**
 * 어드민 서버(Vercel)는 UTC 로 돈다. 한국 시각 0~9시는 UTC 로는 전날이라,
 * 여기서 하루가 밀리면 "오늘 들어온 데이터가 통째로 빠진 통계"가 나간다.
 * 그 경계를 고정한다.
 */
describe("kstRange — KST 일자 경계", () => {
  afterEach(() => vi.useRealTimers());

  function at(iso: string) {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));
  }

  it("UTC 로는 전날인 KST 새벽에도 오늘은 KST 기준이다", () => {
    // 2026-09-03 01:00 KST = 2026-09-02 16:00 UTC
    at("2026-09-02T16:00:00Z");
    expect(kstToday()).toBe("2026-09-03");
  });

  it("UTC 자정 직전(KST 오전)도 같은 날을 가리킨다", () => {
    // 2026-09-03 08:59 KST = 2026-09-02 23:59 UTC
    at("2026-09-02T23:59:00Z");
    expect(kstToday()).toBe("2026-09-03");
  });

  it("days=1 이면 오늘 하루", () => {
    at("2026-09-02T16:00:00Z");
    expect(kstRange(1)).toEqual({ from: "2026-09-03", to: "2026-09-03" });
  });

  it("days=30 이면 오늘을 포함한 30일 (경계 포함)", () => {
    at("2026-09-02T16:00:00Z");
    expect(kstRange(30)).toEqual({ from: "2026-08-05", to: "2026-09-03" });
  });

  it("월 경계를 넘어도 밀리지 않는다", () => {
    at("2026-03-01T00:00:00Z"); // 2026-03-01 09:00 KST
    expect(kstRange(2)).toEqual({ from: "2026-02-28", to: "2026-03-01" });
  });
});

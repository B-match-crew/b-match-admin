import { describe, expect, it } from "vitest";
import { localInputValueDaysFromNow } from "./format-date";

describe("localInputValueDaysFromNow — 정지 종료일 기본값", () => {
  it("⭐ 로컬 시각으로 만든다 — 로컬로 다시 읽으면 정확히 N일 뒤다", () => {
    const now = new Date(2026, 8, 22, 14, 30); // 로컬 2026-09-22 14:30
    const value = localInputValueDaysFromNow(7, now);

    expect(value).toBe("2026-09-29T14:30");
    // 다이얼로그는 new Date(value) 로 로컬로 읽는다 — 같은 순간이어야 한다.
    const back = new Date(value);
    expect(back.getTime() - now.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("월말을 넘긴다", () => {
    expect(localInputValueDaysFromNow(7, new Date(2026, 8, 28, 9, 5))).toBe(
      "2026-10-05T09:05"
    );
  });
});

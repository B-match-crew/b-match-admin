import { describe, expect, it } from "vitest";
import {
  MAX_RANGE_DAYS,
  addDays,
  fromDateString,
  isDateString,
  kstDayOf,
  presetRange,
  rangeDays,
  toDateString,
  validateRange,
  weekdayKo,
} from "./period";

/**
 * 광고주에게 나가는 기간이다. 하루가 밀리거나 지난 달이 말일을 빠뜨리면 에러 없이
 * 청구 근거가 틀린다.
 */
describe("presetRange", () => {
  it("최근 7일·30일은 오늘을 포함한다", () => {
    expect(presetRange("last7", "2026-09-15")).toEqual({ from: "2026-09-09", to: "2026-09-15" });
    expect(presetRange("last30", "2026-09-15")).toEqual({ from: "2026-08-17", to: "2026-09-15" });
    expect(rangeDays(presetRange("last30", "2026-09-15"))).toBe(30);
  });

  it("이번 달은 1일부터 오늘까지", () => {
    expect(presetRange("thisMonth", "2026-09-15")).toEqual({ from: "2026-09-01", to: "2026-09-15" });
    expect(presetRange("thisMonth", "2026-09-01")).toEqual({ from: "2026-09-01", to: "2026-09-01" });
  });

  it("지난 달은 1일부터 말일까지 — 달마다 말일이 다르다", () => {
    expect(presetRange("lastMonth", "2026-09-15")).toEqual({ from: "2026-08-01", to: "2026-08-31" });
    expect(presetRange("lastMonth", "2026-03-01")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(presetRange("lastMonth", "2028-03-10")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });

  it("1월의 지난 달은 작년 12월", () => {
    expect(presetRange("lastMonth", "2027-01-05")).toEqual({ from: "2026-12-01", to: "2026-12-31" });
  });
});

describe("validateRange", () => {
  it("정상 기간은 통과", () => {
    expect(validateRange({ from: "2026-09-01", to: "2026-09-30" })).toBeNull();
    expect(validateRange({ from: "2026-09-01", to: "2026-09-01" })).toBeNull();
  });

  it("시작이 종료보다 늦으면 거절", () => {
    expect(validateRange({ from: "2026-09-02", to: "2026-09-01" })).toBe("시작일이 종료일보다 늦습니다");
  });

  it(`서버와 같은 상한 — ${MAX_RANGE_DAYS}일은 되고 하루 더는 안 된다`, () => {
    const from = "2025-01-01";
    expect(validateRange({ from, to: addDays(from, MAX_RANGE_DAYS - 1) })).toBeNull();
    expect(validateRange({ from, to: addDays(from, MAX_RANGE_DAYS) })).toBe(
      `최대 ${MAX_RANGE_DAYS}일까지 조회할 수 있습니다`
    );
  });

  it("없는 날짜·형식이 다른 값은 거절", () => {
    expect(isDateString("2026-02-30")).toBe(false);
    expect(isDateString("2026-9-1")).toBe(false);
    expect(validateRange({ from: "2026-02-30", to: "2026-03-01" })).toBe("날짜 형식이 올바르지 않습니다");
  });
});

describe("날짜 변환", () => {
  it("UTC 15시는 KST 로 다음 날이다", () => {
    expect(kstDayOf("2026-09-01T14:59:59Z")).toBe("2026-09-01");
    expect(kstDayOf("2026-09-01T15:00:00Z")).toBe("2026-09-02");
  });

  it("요일", () => {
    expect(weekdayKo("2026-09-15")).toBe("화");
    expect(weekdayKo("2026-09-13")).toBe("일");
  });

  it("달력의 로컬 날짜와 일자 문자열이 왕복한다", () => {
    expect(toDateString(fromDateString("2026-12-31"))).toBe("2026-12-31");
    expect(toDateString(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

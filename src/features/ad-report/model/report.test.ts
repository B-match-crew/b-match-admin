import { describe, expect, it } from "vitest";
import type { HomeImpressionReport } from "./actions";
import { isBeforeCollection, reportCsv } from "./report";

describe("isBeforeCollection", () => {
  it("한 건도 없으면 전 기간이 수집 전", () => {
    expect(isBeforeCollection("2026-09-01", null)).toBe(true);
  });

  it("수집 시작일은 KST 일자로 끊고, 시작 당일은 수집 전이 아니다", () => {
    // 2026-09-02 00:30 KST
    const since = "2026-09-01T15:30:00Z";
    expect(isBeforeCollection("2026-09-01", since)).toBe(true);
    expect(isBeforeCollection("2026-09-02", since)).toBe(false);
    expect(isBeforeCollection("2026-09-03", since)).toBe(false);
  });
});

describe("reportCsv", () => {
  const report: HomeImpressionReport = {
    range: { from: "2026-09-01", to: "2026-09-03" },
    // 같은 기기가 이틀 왔다 — 일별 기기 합은 2, 기간 순 기기는 1
    summary: { impressions: 5, devices: 1, members: 1, frequency: 5, collectedSince: "2026-09-01T15:30:00Z" },
    daily: [
      { date: "2026-09-01", impressions: 0, devices: 0, members: 0 },
      { date: "2026-09-02", impressions: 3, devices: 1, members: 1 },
      { date: "2026-09-03", impressions: 2, devices: 1, members: 1 },
    ],
  };
  const csv = reportCsv(report);
  const total = csv.rows.find((r) => r[0] === "기간 합계");

  it("파일명에 조회 기간이 들어간다", () => {
    expect(csv.filename).toBe("home_impressions_2026-09-01_2026-09-03.csv");
  });

  it("수집 전 날짜는 0 이 아니라 비우고 '수집 전' 으로 적는다", () => {
    expect(csv.rows[0]).toEqual(["2026-09-01", "화", "", "", "", "수집 전"]);
    expect(csv.rows[1]).toEqual(["2026-09-02", "수", "3", "1", "1", ""]);
  });

  it("🔴 합계의 순 기기는 일별 합(2)이 아니라 서버가 센 기간 순 수(1)", () => {
    expect(total?.[3]).toBe("1");
    expect(total?.[2]).toBe("5");
  });

  it("기기당 평균은 소수 둘째 자리, 없으면 빈칸", () => {
    expect(csv.rows.find((r) => r[0] === "기기당 평균 노출")?.[2]).toBe("5.00");
    const empty = reportCsv({ ...report, summary: { ...report.summary, frequency: null } });
    expect(empty.rows.find((r) => r[0] === "기기당 평균 노출")?.[2]).toBe("");
  });

  it("노출 정의가 함께 나간다", () => {
    expect(csv.rows.some((r) => r[0] === "노출 정의" && r[5].includes("1초"))).toBe(true);
  });
});

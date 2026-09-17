import { describe, expect, it } from "vitest";
import type { ImpressionReport } from "./actions";
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
  const report: ImpressionReport = {
    range: { from: "2026-09-01", to: "2026-09-03" },
    placements: [
      {
        placement: "home_banner",
        // 같은 기기가 이틀 왔다 — 일별 기기 합은 2, 기간 순 기기는 1
        summary: { impressions: 5, devices: 1, members: 1, frequency: 5, collectedSince: "2026-09-01T15:30:00Z" },
        daily: [
          { date: "2026-09-01", impressions: 0, devices: 0, members: 0 },
          { date: "2026-09-02", impressions: 3, devices: 1, members: 1 },
          { date: "2026-09-03", impressions: 2, devices: 1, members: 1 },
        ],
      },
      {
        placement: "map",
        // 지도는 아직 한 건도 없다 — 전 기간이 수집 전
        summary: { impressions: 0, devices: 0, members: 0, frequency: null, collectedSince: null },
        daily: [
          { date: "2026-09-01", impressions: 0, devices: 0, members: 0 },
          { date: "2026-09-02", impressions: 0, devices: 0, members: 0 },
          { date: "2026-09-03", impressions: 0, devices: 0, members: 0 },
        ],
      },
    ],
  };
  const csv = reportCsv(report);
  const summaryRow = (label: string) => csv.rows.find((r) => r[0] === label);

  it("파일명에 조회 기간이 들어간다", () => {
    expect(csv.filename).toBe("ad_impressions_2026-09-01_2026-09-03.csv");
  });

  it("날짜 한 줄에 지면마다 3열 — 지면 순서대로", () => {
    expect(csv.headers).toEqual([
      "날짜", "요일",
      "홈 배너 노출", "홈 배너 순 기기", "홈 배너 순 회원",
      "지도 노출", "지도 순 기기", "지도 순 회원",
      "비고",
    ]);
  });

  it("수집 전 칸은 0 이 아니라 비우고, 비고에 어느 지면인지 적는다", () => {
    expect(csv.rows[0]).toEqual(["2026-09-01", "화", "", "", "", "", "", "", "홈 배너 수집 전 · 지도 수집 전"]);
    expect(csv.rows[1]).toEqual(["2026-09-02", "수", "3", "1", "1", "", "", "", "지도 수집 전"]);
  });

  it("🔴 합계의 순 기기는 일별 합(2)이 아니라 서버가 센 기간 순 수(1)", () => {
    expect(summaryRow("홈 배너")?.slice(2, 5)).toEqual(["5", "1", "1"]);
  });

  it("기기당 평균은 소수 둘째 자리, 없으면 빈칸", () => {
    expect(summaryRow("홈 배너")?.[5]).toBe("5.00");
    expect(summaryRow("지도")?.[5]).toBe("");
  });

  it("지면마다 노출 정의가 함께 나간다", () => {
    expect(summaryRow("노출 정의 — 홈 배너")?.[1]).toContain("배너 영역 전체");
    expect(summaryRow("노출 정의 — 지도")?.[1]).toContain("지도 화면");
  });
});

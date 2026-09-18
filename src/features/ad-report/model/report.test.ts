import { describe, expect, it } from "vitest";
import type { ImpressionReport } from "./actions";
import { formatCtr, isBeforeCollection, reportCsv } from "./report";

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
        // 같은 기기가 이틀 왔다 — 일별 기기 합은 2, 기간 순 기기는 1.
        // 🔴 클릭 수집은 노출보다 **하루 늦게** 붙었다(09-03 KST). 09-02 의 클릭 0 은
        //    "안 눌렀다" 가 아니라 "세기 전" 이라 빈 칸이어야 한다.
        summary: {
          impressions: 5,
          devices: 1,
          members: 1,
          frequency: 5,
          collectedSince: "2026-09-01T15:30:00Z",
          clicks: 2,
          clickDevices: 1,
          ctr: 0.4,
          clicksCollectedSince: "2026-09-02T15:30:00Z",
        },
        daily: [
          { date: "2026-09-01", impressions: 0, devices: 0, members: 0, clicks: 0, clickDevices: 0 },
          { date: "2026-09-02", impressions: 3, devices: 1, members: 1, clicks: 0, clickDevices: 0 },
          { date: "2026-09-03", impressions: 2, devices: 1, members: 1, clicks: 2, clickDevices: 1 },
        ],
      },
      {
        placement: "map",
        // 지도는 아직 한 건도 없고, 클릭 지면도 아니다 — clicks 는 0 이 아니라 null
        summary: {
          impressions: 0,
          devices: 0,
          members: 0,
          frequency: null,
          collectedSince: null,
          clicks: null,
          clickDevices: null,
          ctr: null,
          clicksCollectedSince: null,
        },
        daily: [
          { date: "2026-09-01", impressions: 0, devices: 0, members: 0, clicks: null, clickDevices: null },
          { date: "2026-09-02", impressions: 0, devices: 0, members: 0, clicks: null, clickDevices: null },
          { date: "2026-09-03", impressions: 0, devices: 0, members: 0, clicks: null, clickDevices: null },
        ],
      },
    ],
  };
  const csv = reportCsv(report);
  const summaryRow = (label: string) => csv.rows.find((r) => r[0] === label);

  it("파일명에 조회 기간이 들어간다", () => {
    expect(csv.filename).toBe("ad_impressions_2026-09-01_2026-09-03.csv");
  });

  it("날짜 한 줄에 지면마다 5열 — 지면 순서대로", () => {
    expect(csv.headers).toEqual([
      "날짜", "요일",
      "홈 배너 노출", "홈 배너 순 기기", "홈 배너 순 회원", "홈 배너 클릭", "홈 배너 순 클릭 기기",
      "지도 노출", "지도 순 기기", "지도 순 회원", "지도 클릭", "지도 순 클릭 기기",
      "비고",
    ]);
  });

  it("수집 전 칸은 0 이 아니라 비우고, 비고에 어느 지면인지 적는다", () => {
    expect(csv.rows[0]).toEqual([
      "2026-09-01", "화",
      "", "", "", "", "",
      "", "", "", "", "",
      "홈 배너 노출 수집 전 · 지도 노출 수집 전",
    ]);
  });

  it("🔴 노출은 세어졌는데 클릭은 아직인 날 — 클릭만 비운다", () => {
    expect(csv.rows[1]).toEqual([
      "2026-09-02", "수",
      "3", "1", "1", "", "",
      "", "", "", "", "",
      "홈 배너 클릭 수집 전 · 지도 노출 수집 전",
    ]);
  });

  it("둘 다 세어진 날은 다섯 칸이 모두 찬다", () => {
    expect(csv.rows[2]).toEqual([
      "2026-09-03", "목",
      "2", "1", "1", "2", "1",
      "", "", "", "", "",
      "지도 노출 수집 전",
    ]);
  });

  it("🔴 클릭이 없는 지면(지도)은 0 이 아니라 빈 칸이다", () => {
    expect(summaryRow("지도")?.slice(6, 9)).toEqual(["", "", ""]);
  });

  it("🔴 합계의 순 기기는 일별 합(2)이 아니라 서버가 센 기간 순 수(1)", () => {
    expect(summaryRow("홈 배너")?.slice(2, 5)).toEqual(["5", "1", "1"]);
  });

  it("기기당 평균은 소수 둘째 자리, 없으면 빈칸", () => {
    expect(summaryRow("홈 배너")?.[5]).toBe("5.00");
    expect(summaryRow("지도")?.[5]).toBe("");
  });

  it("합계에 클릭 · 순 클릭 기기 · 클릭률이 함께 나간다", () => {
    expect(summaryRow("홈 배너")?.slice(6, 9)).toEqual(["2", "1", "40.00%"]);
  });

  it("지면마다 노출 정의가 함께 나간다", () => {
    expect(summaryRow("노출 정의 — 홈 배너")?.[1]).toContain("배너 영역 전체");
    expect(summaryRow("노출 정의 — 지도")?.[1]).toContain("지도 화면");
  });

  it("클릭 정의는 클릭을 세는 지면만 나간다", () => {
    expect(summaryRow("클릭 정의 — 홈 배너")?.[1]).toContain("배너를 누른 횟수");
    expect(summaryRow("클릭 정의 — 지도")).toBeUndefined();
  });

  it("빈 클릭 칸의 뜻을 참고에 적는다 — 0 회로 읽히면 안 된다", () => {
    const notes = csv.rows.filter((r) => r[0] === "참고").map((r) => r[1]);
    expect(notes.some((n) => n.includes("클릭 0 회를 뜻하지 않습니다"))).toBe(true);
  });
});

describe("formatCtr", () => {
  it("비율을 퍼센트 소수 둘째 자리로", () => {
    expect(formatCtr(0.0512)).toBe("5.12%");
    expect(formatCtr(0.4)).toBe("40.00%");
    expect(formatCtr(0)).toBe("0.00%");
  });

  it("🔴 null 은 0% 가 아니라 빈 칸 — 0% 는 '아무도 안 눌렀다' 라는 뜻이다", () => {
    expect(formatCtr(null)).toBe("");
  });
});

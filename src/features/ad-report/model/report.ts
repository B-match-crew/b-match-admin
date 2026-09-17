import type { HomeImpressionReport } from "./actions";
import { kstDayOf, weekdayKo } from "./period";

/** 노출 1회의 정의. 화면과 CSV 가 같은 문장을 쓴다 — 광고주에게 두 가지 설명이 나가지 않게. */
export const IMPRESSION_DEFINITION =
  "앱 홈 상단 배너 영역 전체가 1초 이상 연속으로 보이면 1회입니다. 탭을 옮겼다 돌아옴 · 홈 위에 연 화면을 닫고 돌아옴 · 앱을 다시 엶 · 스크롤을 내렸다가 배너가 다 보이게 다시 올림이 각각 1회이고, 배너가 스크롤로 조금이라도 잘려 있는 동안과 1초 안에 지나간 것, 팝업이 떴다 닫힌 것은 세지 않습니다.";

/**
 * 계측이 시작되기 전 날짜인가.
 *
 * 한 번도 들어온 적이 없으면(null) 전 기간이 수집 전이다. 수집이 시작된 **당일**은
 * 수집 전이 아니다 — 일부만 셌더라도 센 것은 센 것이다.
 */
export function isBeforeCollection(
  day: string,
  collectedSince: string | null
): boolean {
  if (collectedSince == null) return true;
  return day < kstDayOf(collectedSince);
}

/**
 * 광고주에게 보내는 CSV.
 *
 * 🔴 합계 행의 기기·회원은 **서버가 센 기간 순 수**다. 일별 열을 더하면 같은 기기가
 * 날마다 다시 세어져 순 도달이 부풀려진다. 수집 전 날짜는 0 대신 비워 "수집 전"
 * 이라고 적는다.
 */
export function reportCsv(report: HomeImpressionReport): {
  filename: string;
  headers: string[];
  rows: string[][];
} {
  const { range, summary, daily } = report;
  const rows: string[][] = daily.map((d) =>
    isBeforeCollection(d.date, summary.collectedSince)
      ? [d.date, weekdayKo(d.date), "", "", "", "수집 전"]
      : [
          d.date,
          weekdayKo(d.date),
          String(d.impressions),
          String(d.devices),
          String(d.members),
          "",
        ]
  );

  rows.push(
    [],
    [
      "기간 합계",
      `${range.from} ~ ${range.to}`,
      String(summary.impressions),
      String(summary.devices),
      String(summary.members),
      "순 기기·순 회원은 기간 전체 기준이며 일별 값의 합이 아닙니다",
    ],
    [
      "기기당 평균 노출",
      "",
      summary.frequency == null ? "" : summary.frequency.toFixed(2),
      "",
      "",
      "",
    ],
    ["노출 정의", "", "", "", "", IMPRESSION_DEFINITION]
  );

  return {
    filename: `home_impressions_${range.from}_${range.to}.csv`,
    headers: ["날짜", "요일", "노출", "순 기기", "순 회원", "비고"],
    rows,
  };
}

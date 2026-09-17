import type { ImpressionReport } from "./actions";
import { kstDayOf, weekdayKo } from "./period";
import { PLACEMENTS, placementLabel } from "./placements";

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
 * 광고주에게 보내는 CSV — 날짜 한 줄에 지면마다 3열(노출 · 순 기기 · 순 회원)을
 * 가로로 놓는다.
 *
 * 🔴 아래 합계 표의 기기·회원은 **서버가 센 기간 순 수**다. 일별 열을 더하면 같은
 * 기기가 날마다 다시 세어져 순 도달이 부풀려진다. 수집 전 칸은 0 대신 비우고
 * 비고에 적는다.
 */
export function reportCsv(report: ImpressionReport): {
  filename: string;
  headers: string[];
  rows: string[][];
} {
  const { range, placements } = report;
  const dates = placements[0]?.daily.map((d) => d.date) ?? [];
  // 지면마다 날짜 → 하루치. 서버가 지면 × 날짜를 전부 채우지만 순서에 기대지 않는다.
  const byDate = placements.map((p) => new Map(p.daily.map((d) => [d.date, d])));

  const rows: string[][] = dates.map((date) => {
    const notes: string[] = [];
    const cells = placements.flatMap((p, i) => {
      const d = byDate[i].get(date);
      if (!d || isBeforeCollection(date, p.summary.collectedSince)) {
        notes.push(`${placementLabel(p.placement)} 수집 전`);
        return ["", "", ""];
      }
      return [String(d.impressions), String(d.devices), String(d.members)];
    });
    return [date, weekdayKo(date), ...cells, notes.join(" · ")];
  });

  rows.push(
    [],
    ["지면", "기간", "노출", "순 기기(기간)", "순 회원(기간)", "기기당 평균 노출"],
    ...placements.map((p) => [
      placementLabel(p.placement),
      `${range.from} ~ ${range.to}`,
      String(p.summary.impressions),
      String(p.summary.devices),
      String(p.summary.members),
      p.summary.frequency == null ? "" : p.summary.frequency.toFixed(2),
    ]),
    [],
    ["참고", "순 기기·순 회원은 기간 전체 기준이며 일별 값의 합이 아닙니다"],
    ...PLACEMENTS.map((m) => [`노출 정의 — ${m.label}`, m.definition])
  );

  return {
    filename: `ad_impressions_${range.from}_${range.to}.csv`,
    headers: [
      "날짜",
      "요일",
      ...placements.flatMap((p) => {
        const label = placementLabel(p.placement);
        return [`${label} 노출`, `${label} 순 기기`, `${label} 순 회원`];
      }),
      "비고",
    ],
    rows,
  };
}

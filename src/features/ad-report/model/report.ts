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
 * 클릭률 표기 — 0.0512 → "5.12%". 비율이 없으면(노출 0 · 클릭 없는 지면) 빈 칸.
 *
 * 🔴 null 을 "0%" 로 적지 않는다. 광고주에게 0% 는 "보여줬는데 아무도 안 눌렀다"
 * 라는 뜻이라, 사실은 "아직 세지 않았다" 인 경우 거짓말이 된다.
 */
export function formatCtr(ctr: number | null): string {
  if (ctr == null) return "";
  return `${(ctr * 100).toFixed(2)}%`;
}

/**
 * 광고주에게 보내는 CSV — 날짜 한 줄에 지면마다 5열(노출 · 순 기기 · 순 회원 ·
 * 클릭 · 순 클릭 기기)을 가로로 놓는다.
 *
 * 🔴 아래 합계 표의 기기·회원·클릭 기기는 **서버가 센 기간 순 수**다. 일별 열을
 * 더하면 같은 기기가 날마다 다시 세어져 순 도달이 부풀려진다. 수집 전 칸은 0 대신
 * 비우고 비고에 적는다.
 *
 * 🔴 **클릭 수집 시작일은 노출과 다르다.** 클릭 계측이 나중에 붙었으므로 그 앞
 * 날짜의 클릭 칸은 0 이 아니라 빈 칸이어야 한다 — 0 으로 적으면 광고주가 그 기간의
 * CTR 을 0% 로 계산한다. 클릭이 아예 없는 지면(지도)도 빈 칸이다.
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
      const label = placementLabel(p.placement);
      const d = byDate[i].get(date);
      if (!d || isBeforeCollection(date, p.summary.collectedSince)) {
        notes.push(`${label} 노출 수집 전`);
        return ["", "", "", "", ""];
      }
      // 클릭은 지면마다·시기마다 따로 판단한다. 노출이 세어진 날이라고 클릭도
      // 세어진 것은 아니다 — 계측이 붙은 시점이 다르다.
      let clicks = "";
      let clickDevices = "";
      if (d.clicks != null) {
        if (isBeforeCollection(date, p.summary.clicksCollectedSince)) {
          notes.push(`${label} 클릭 수집 전`);
        } else {
          clicks = String(d.clicks);
          clickDevices = String(d.clickDevices ?? 0);
        }
      }
      return [
        String(d.impressions),
        String(d.devices),
        String(d.members),
        clicks,
        clickDevices,
      ];
    });
    return [date, weekdayKo(date), ...cells, notes.join(" · ")];
  });

  rows.push(
    [],
    [
      "지면",
      "기간",
      "노출",
      "순 기기(기간)",
      "순 회원(기간)",
      "기기당 평균 노출",
      "클릭",
      "순 클릭 기기(기간)",
      "클릭률",
    ],
    ...placements.map((p) => [
      placementLabel(p.placement),
      `${range.from} ~ ${range.to}`,
      String(p.summary.impressions),
      String(p.summary.devices),
      String(p.summary.members),
      p.summary.frequency == null ? "" : p.summary.frequency.toFixed(2),
      p.summary.clicks == null ? "" : String(p.summary.clicks),
      p.summary.clickDevices == null ? "" : String(p.summary.clickDevices),
      formatCtr(p.summary.ctr),
    ]),
    [],
    ["참고", "순 기기·순 회원·순 클릭 기기는 기간 전체 기준이며 일별 값의 합이 아닙니다"],
    ["참고", "클릭 칸이 비어 있으면 그 지면·기간에 클릭을 세지 않은 것이며, 클릭 0 회를 뜻하지 않습니다"],
    ...PLACEMENTS.map((m) => [`노출 정의 — ${m.label}`, m.definition]),
    ...PLACEMENTS.filter((m) => m.clickDefinition != null).map((m) => [
      `클릭 정의 — ${m.label}`,
      m.clickDefinition!,
    ])
  );

  return {
    filename: `ad_impressions_${range.from}_${range.to}.csv`,
    headers: [
      "날짜",
      "요일",
      ...placements.flatMap((p) => {
        const label = placementLabel(p.placement);
        return [
          `${label} 노출`,
          `${label} 순 기기`,
          `${label} 순 회원`,
          `${label} 클릭`,
          `${label} 순 클릭 기기`,
        ];
      }),
      "비고",
    ],
    rows,
  };
}

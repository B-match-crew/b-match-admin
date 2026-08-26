/**
 * KST 기준 날짜 범위.
 *
 * 어드민 서버(Vercel)는 UTC 로 돈다. `new Date()` 를 그대로 slice 하면 한국
 * 시각 0~9시 사이에 **하루가 밀린 범위**가 만들어져, 오늘 들어온 데이터가
 * 통째로 빠진 통계가 나온다. 집계 RPC 는 전부 KST 일자를 받으므로 경계도
 * KST 로 끊는다.
 *
 * `toLocaleDateString("en-CA")` 가 `yyyy-MM-dd` 를 준다 — 포맷 라이브러리 없이
 * 타임존을 지정할 수 있는 가장 짧은 경로다.
 */
export interface KstRange {
  from: string; // yyyy-MM-dd (KST)
  to: string; // yyyy-MM-dd (KST)
}

/** KST 기준 오늘을 포함한 최근 [days]일. days=1 이면 오늘 하루. */
export function kstRange(days: number): KstRange {
  const today = kstToday();
  const fromDate = new Date(`${today}T00:00:00Z`);
  fromDate.setUTCDate(fromDate.getUTCDate() - (days - 1));
  return { from: fromDate.toISOString().slice(0, 10), to: today };
}

/** KST 기준 오늘 (yyyy-MM-dd) */
export function kstToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

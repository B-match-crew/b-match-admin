/**
 * 광고 리포트 기간 — 전부 **KST 일자 문자열**(yyyy-MM-dd)로 다룬다.
 *
 * Date 객체로 들고 다니면 서버(Vercel, UTC)와 브라우저(KST)에서 같은 값이 다른
 * 날을 가리킨다. 계산은 일자 문자열을 UTC 자정으로 읽어서만 한다 — 시간대가
 * 끼어들 틈이 없다. (오늘이 언제인지는 shared 의 kstToday 가 정한다)
 */

export type PeriodPreset =
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "custom";

export interface DateRangeKst {
  from: string;
  to: string;
}

/**
 * 서버(app migration 118)와 같은 상한. 서버가 거절하는 것을 화면이 먼저 막는다 —
 * 값을 바꾸려면 두 곳을 함께 바꿀 것.
 */
export const MAX_RANGE_DAYS = 400;

export const PRESETS: readonly { value: PeriodPreset; label: string }[] = [
  { value: "last7", label: "최근 7일" },
  { value: "last30", label: "최근 30일" },
  { value: "thisMonth", label: "이번 달" },
  { value: "lastMonth", label: "지난 달" },
];

const DAY_MS = 86_400_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const toUtcMs = (day: string) => Date.parse(`${day}T00:00:00Z`);
const fromUtcMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** yyyy-MM-dd 이고 실제로 있는 날인가 (2026-02-30 은 아니다) */
export function isDateString(v: string): boolean {
  if (!DATE_RE.test(v)) return false;
  const ms = toUtcMs(v);
  return !Number.isNaN(ms) && fromUtcMs(ms) === v;
}

export function addDays(day: string, n: number): string {
  return fromUtcMs(toUtcMs(day) + n * DAY_MS);
}

/** 양 끝을 포함한 일수 */
export function rangeDays(r: DateRangeKst): number {
  return Math.round((toUtcMs(r.to) - toUtcMs(r.from)) / DAY_MS) + 1;
}

/** 프리셋 → 기간. "최근 N일" 은 오늘을 포함하고, "지난 달" 은 그 달 1일~말일이다. */
export function presetRange(
  preset: Exclude<PeriodPreset, "custom">,
  today: string
): DateRangeKst {
  const firstOfThisMonth = `${today.slice(0, 8)}01`;
  switch (preset) {
    case "last7":
      return { from: addDays(today, -6), to: today };
    case "last30":
      return { from: addDays(today, -29), to: today };
    case "thisMonth":
      return { from: firstOfThisMonth, to: today };
    case "lastMonth": {
      const lastOfPrevMonth = addDays(firstOfThisMonth, -1);
      return { from: `${lastOfPrevMonth.slice(0, 8)}01`, to: lastOfPrevMonth };
    }
  }
}

/** 조회할 수 없는 기간이면 그 이유, 괜찮으면 null */
export function validateRange(r: DateRangeKst): string | null {
  if (!isDateString(r.from) || !isDateString(r.to)) {
    return "날짜 형식이 올바르지 않습니다";
  }
  if (r.from > r.to) return "시작일이 종료일보다 늦습니다";
  if (rangeDays(r) > MAX_RANGE_DAYS) {
    return `최대 ${MAX_RANGE_DAYS}일까지 조회할 수 있습니다`;
  }
  return null;
}

/** UTC 시각 → 그 순간의 KST 일자 */
export function kstDayOf(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function weekdayKo(day: string): string {
  return WEEKDAYS[new Date(toUtcMs(day)).getUTCDay()];
}

/** 2026-09-01 → 2026.09.01 */
export function formatDay(day: string): string {
  return day.replaceAll("-", ".");
}

/**
 * 달력(react-day-picker)은 브라우저 로컬 Date 를 준다. 사람이 고른 것은 "순간"이
 * 아니라 "날짜"라서 로컬 연·월·일을 그대로 읽는다 — UTC 로 바꾸면 KST 오전 9시
 * 이전 기준으로 하루가 밀린다.
 */
export function toDateString(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function fromDateString(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

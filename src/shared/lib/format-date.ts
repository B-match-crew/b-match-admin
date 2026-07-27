import { format, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

export function formatDate(date: string | Date): string {
  return format(new Date(date), "yyyy.MM.dd", { locale: ko });
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "yyyy.MM.dd HH:mm", { locale: ko });
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ko });
}

export function formatTime(date: string | Date): string {
  return format(new Date(date), "HH:mm", { locale: ko });
}

/**
 * KST(UTC+9) 고정 오프셋 — 한국은 DST 가 없어 상시 +9.
 *
 * 위 포매터들은 브라우저 로컬 시간대를 따르지만, 서버 점검처럼 "한국 기준
 * 시각"을 보장해야 하는 값은 아래 헬퍼로 KST 를 명시한다 (관리자가 해외에
 * 있어도 앱 사용자와 같은 시각을 본다).
 */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** UTC 시각 → KST 표시 문자열 ("2026.07.27 10:00 (KST)") */
export function formatKst(date: string | Date): string {
  const kst = new Date(new Date(date).getTime() + KST_OFFSET_MS);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${kst.getUTCFullYear()}.${p(kst.getUTCMonth() + 1)}.${p(kst.getUTCDate())} ` +
    `${p(kst.getUTCHours())}:${p(kst.getUTCMinutes())} (KST)`
  );
}

/** UTC 시각 → `<input type="datetime-local">` 값 (KST 기준) */
export function toKstInputValue(date: string | Date): string {
  const kst = new Date(new Date(date).getTime() + KST_OFFSET_MS);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${kst.getUTCFullYear()}-${p(kst.getUTCMonth() + 1)}-${p(kst.getUTCDate())}` +
    `T${p(kst.getUTCHours())}:${p(kst.getUTCMinutes())}`
  );
}

/** `<input type="datetime-local">` 값(KST 로 해석) → UTC ISO 문자열 */
export function fromKstInputValue(value: string): string {
  // "YYYY-MM-DDTHH:mm" 을 KST 로 읽어 UTC 로 환산한다.
  const asUtc = new Date(`${value}:00.000Z`).getTime();
  return new Date(asUtc - KST_OFFSET_MS).toISOString();
}

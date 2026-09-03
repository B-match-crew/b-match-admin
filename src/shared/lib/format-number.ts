export function formatNumber(num: number): string {
  return new Intl.NumberFormat("ko-KR").format(num);
}

export function formatCurrency(num: number): string {
  return `${formatNumber(num)}원`;
}

export function formatPercent(num: number, decimals = 1): string {
  return `${num.toFixed(decimals)}%`;
}

/**
 * 분 → 사람이 읽는 길이. 응답 시간은 분·시간·일 단위가 모두 나온다.
 *
 * stats/analytics 두 화면이 같은 응답 시간을 그린다(90 의 전체 중앙값,
 * 104 의 모임장별 중앙값). feature 끼리 import 하지 않도록 여기 둔다.
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  if (minutes < 60 * 24) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
  }
  const d = Math.floor(minutes / (60 * 24));
  const h = Math.round((minutes % (60 * 24)) / 60);
  return h === 0 ? `${d}일` : `${d}일 ${h}시간`;
}

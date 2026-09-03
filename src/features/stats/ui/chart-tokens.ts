/**
 * 통계 화면이 공유하는 차트 토큰.
 */

/**
 * 시리즈 색 — globals.css 의 검증된 팔레트를 참조한다.
 * 순서 고정, 순환 금지 (3번째 시리즈가 필요해지면 팔레트를 다시 검증할 것).
 */
export const SERIES_1 = "var(--color-series-1)";

export const SERIES_2 = "var(--color-series-2)";

export const SERIES_MUTED = "var(--color-series-muted)";

/** '미입력'/'미지정' 은 카테고리가 아니라 결측이므로 중립색으로 뺀다 */
export const isMissing = (bucket: string) =>
  bucket === "미입력" || bucket === "미지정";

export const RANGES = [
  { value: "7", label: "7일" },
  { value: "30", label: "30일" },
  { value: "90", label: "90일" },
] as const;

export const DOW_LABEL = ["일", "월", "화", "수", "목", "금", "토"];

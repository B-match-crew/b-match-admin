/**
 * 시리즈 색 — globals.css 의 검증된 팔레트. 순서 고정, 순환 금지.
 * (`/stats` 와 같은 팔레트를 쓴다 — 페이지가 달라도 같은 색은 같은 뜻이어야 한다)
 */
export const SERIES_1 = "var(--color-series-1)";

export const SERIES_2 = "var(--color-series-2)";

/** 코호트 히트맵용 순차 램프 — 단일 색상 light→dark (무지개 금지). */
export const SEQUENTIAL = [
  "var(--color-bds-primary-100)",
  "var(--color-bds-primary-300)",
  "var(--color-bds-primary-500)",
  "var(--color-bds-primary-400)",
  "var(--color-bds-primary-900)",
];

export const RANGES = [
  { value: "7", label: "7일" },
  { value: "30", label: "30일" },
  { value: "90", label: "90일" },
] as const;

export const AXIS_TICK = {
  fontSize: 11,
  fill: "var(--color-bds-label-assistive)",
} as const;

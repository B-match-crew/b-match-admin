/**
 * ad-report — actions 의 응답 모델 (app migration 117).
 */
import type { DateRangeKst } from "./period";

/**
 * 하루치. `devices`·`members` 는 **그 날의** 순 수라 날끼리 더하면 안 된다 —
 * 같은 기기가 사흘 오면 1+1+1 이 된다. 기간 순 수는 [HomeImpressionSummary].
 */
export interface HomeImpressionDay {
  date: string;
  impressions: number;
  devices: number;
  members: number;
}

export interface HomeImpressionSummary {
  impressions: number;
  /** 기간 순 기기 = 순 도달 */
  devices: number;
  /** 기간 순 회원 (비회원 제외) */
  members: number;
  /** 기기당 평균 노출. 기기가 0 이면 null — 0 으로 그리면 "한 번도 안 보였다" 로 읽힌다 */
  frequency: number | null;
  /**
   * 기간과 무관하게 처음 들어온 노출 시각. null = 아직 한 건도 없다.
   * 🔴 이보다 앞 날짜의 0 은 "안 보였다" 가 아니라 **"세기 전"** 이다.
   */
  collectedSince: string | null;
}

export interface HomeImpressionReport {
  /** 이 리포트가 실제로 조회한 기간 — CSV 파일명·표기가 화면의 현재 선택과 어긋나지 않게 */
  range: DateRangeKst;
  summary: HomeImpressionSummary;
  daily: HomeImpressionDay[];
}

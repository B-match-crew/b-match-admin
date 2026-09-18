/**
 * ad-report — actions 의 응답 모델 (app migration 118).
 */
import type { DateRangeKst } from "./period";

/**
 * 광고 지면. 서버(118 `fn_admin_impression_placements`)의 코드와 같은 값이어야 한다 —
 * 여기 없는 지면을 서버가 보내면 화면에 나오지 않는다.
 */
export type Placement = "home_banner" | "map";

/**
 * 하루치. `devices`·`members` 는 **그 날의** 순 수라 날끼리 더하면 안 된다 —
 * 같은 기기가 사흘 오면 1+1+1 이 된다. 기간 순 수는 [ImpressionSummary].
 */
export interface ImpressionDay {
  date: string;
  impressions: number;
  devices: number;
  members: number;
  /**
   * 그 날의 클릭 수. **null = 이 지면엔 클릭이 없다**(지도처럼 광고 지면이 아직
   * 없는 곳). 0 과 다르다 — 0 으로 그리면 "보였는데 아무도 안 눌렀다" 로 읽힌다.
   */
  clicks: number | null;
  /** 그 날 클릭한 순 기기. [clicks] 와 같은 null 규칙. 날끼리 더하면 안 된다. */
  clickDevices: number | null;
}

export interface ImpressionSummary {
  impressions: number;
  /** 기간 순 기기 = 순 도달 */
  devices: number;
  /** 기간 순 회원 (비회원 제외) */
  members: number;
  /** 기기당 평균 노출. 기기가 0 이면 null — 0 으로 그리면 "한 번도 안 보였다" 로 읽힌다 */
  frequency: number | null;
  /**
   * 기간과 무관하게 **이 지면에** 처음 들어온 노출 시각. null = 아직 한 건도 없다.
   * 🔴 이보다 앞 날짜의 0 은 "안 보였다" 가 아니라 **"세기 전"** 이다. 지면마다 다르다.
   */
  collectedSince: string | null;
  /** 기간 클릭 수. null = 이 지면엔 클릭이 없다 */
  clicks: number | null;
  /** 기간 순 클릭 기기. 일별 값의 합이 아니다 */
  clickDevices: number | null;
  /**
   * 클릭률 = 클릭 / 노출. **노출이 0 이면 null** — 보인 적이 없으면 비율이 없다.
   * 0% 로 그리면 "보였는데 아무도 안 눌렀다" 가 되어 광고주에게 거짓말이 된다.
   */
  ctr: number | null;
  /**
   * 이 지면에 처음 들어온 **클릭** 시각. 🔴 [collectedSince] 와 **다른 값**이다 —
   * 클릭 계측이 노출보다 늦게 붙었으므로, 그 앞 날짜의 클릭 0 은 "안 눌렀다" 가
   * 아니라 **"세기 전"** 이다. 이걸 섞으면 출시 직후 CTR 이 0% 로 보인다.
   */
  clicksCollectedSince: string | null;
}

export interface PlacementReport {
  placement: Placement;
  summary: ImpressionSummary;
  daily: ImpressionDay[];
}

export interface ImpressionReport {
  /** 이 리포트가 실제로 조회한 기간 — CSV 파일명·표기가 화면의 현재 선택과 어긋나지 않게 */
  range: DateRangeKst;
  /** 지면 목록([PLACEMENTS]) 순서. 서버가 한 지면을 빠뜨려도 0 으로 채워 항상 모든 지면이 있다 */
  placements: PlacementReport[];
}

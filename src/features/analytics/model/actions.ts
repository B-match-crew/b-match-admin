/**
 * analytics — actions 의 응답·입력 모델.
 *
 * "use server" 파일은 값으로 async 함수만 내보낼 수 있어, 타입이 조회 함수
 * 사이사이에 끼어 있었다. model 세그먼트로 꺼내면 상수도 같은 자리에 둘 수
 * 있고(그래서 constants.ts 를 따로 두던 우회가 사라진다), 화면이 조회 구현을
 * 끌어오지 않고 모양만 볼 수 있다.
 */

export interface FunnelStep {
  stepOrder: number;
  stepName: string;
  users: number;
  /** 첫 단계 대비 잔존율(%). 첫 단계는 100. */
  retentionFromTop: number | null;
  /** 직전 단계 대비 전환율(%). 첫 단계는 null. */
  conversionFromPrev: number | null;
}

export interface ActiveUsersItem {
  date: string;
  dau: number;
  dauMember: number;
  wau: number;
  wauMember: number;
  mau: number;
  mauMember: number;
}

export interface CohortItem {
  week: string;
  size: number;
  /** 재방문 **비율(%)**. 인원이 아니라 비율로 보는 게 주차 간 비교에 맞다. */
  d1: number | null;
  d7: number | null;
  d30: number | null;
}

export interface SupplyDemandItem {
  region: string;
  supply: number;
  demand: number;
  /** 공급 1건당 수요. 높을수록 호스트 영업 우선순위가 높다. */
  demandPerSupply: number | null;
}

export interface DemandGapItem {
  region: string;
  weekday: string;
  level: string;
  emptyViews: number;
}

export interface MatchConversionItem {
  matchId: number;
  title: string;
  region: string;
  views: number;
  contacts: number;
  /** 조회 대비 연락률(%). */
  conversion: number | null;
}

export interface ViralStep {
  stepOrder: number;
  stepName: string;
  events: number;
  /** 직전 단계 대비 전환율(%). */
  conversionFromPrev: number | null;
}

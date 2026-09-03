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

/**
 * 모임별 모집글 수 대비 연락 전환율 (app migration 103).
 *
 * 글 단위(조회 대비 연락률)에서 **모임 단위**로 올렸다. 운영이 묻는 것은
 * "이 글이 왜 연락이 안 오나" 가 아니라 "어느 모임이 글은 계속 올리는데 연락이
 * 안 오는가" 이고, 글 단위 랭킹에서는 글 20개인 모임과 1개인 모임이 섞여
 * 그 답이 나오지 않는다.
 */
export interface ClubContactConversionItem {
  hostId: number;
  /** 모임명. 모임을 지웠다 다시 만든 경우 살아있는 쪽 이름 */
  clubName: string | null;
  nickname: string | null;
  /** 기간 내 올라온 살아있는 모집글 수 (분모) */
  matches: number;
  /** 그중 연락을 한 건이라도 받은 글 수 (분자) */
  contactedMatches: number;
  /**
   * 글 기준 전환율(%). **연락 건수 비율이 아니다** — 인기 글 하나에 연락이
   * 몰리면 건수 비율은 600%가 되어, 나머지 글이 헛돌고 있다는 사실이 가려진다.
   */
  conversion: number | null;
  /** 총 연락 건수 (참고) */
  contacts: number;
  /** 총 조회 수 (참고) */
  views: number;
  /** 최근 3일 내 등록분 — 아직 연락받을 시간이 충분하지 않은 글 */
  recentMatches: number;
}

export interface ViralStep {
  stepOrder: number;
  stepName: string;
  events: number;
  /** 직전 단계 대비 전환율(%). */
  conversionFromPrev: number | null;
}

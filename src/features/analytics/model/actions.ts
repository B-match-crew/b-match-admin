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

/**
 * 모임장별 문의 응답 지표 (app migration 104).
 *
 * 103 이 "글이 연락을 받는가" 라면 이쪽은 **"그 연락에 모임장이 답을 하는가"** 다.
 * 90(통계 화면의 전체 응답률)은 합계 하나뿐이라 운영이 할 수 있는 일이 없다 —
 * 답을 안 하는 사람에게 연락하려면 축이 사람이어야 한다.
 */
export interface HostResponseItem {
  hostUserId: number;
  nickname: string | null;
  /** 살아있는 모임명. null = 지금 모임이 없다(삭제/탈퇴) */
  clubName: string | null;
  level: string | null;
  userStatus: string;
  /** 기간 내 받은 문의(= 새로 열린 1:1 방) */
  rooms: number;
  /** 그중 모임장 **본인이** 답한 방 */
  answered: number;
  responseRate: number | null;
  unanswered: number;
  /** 미응답이지만 열린 지 24시간 이내 = 아직 판정 유보 */
  unansweredRecent: number;
  /** 첫 응답까지 걸린 시간의 중앙값(분) */
  medianMinutes: number | null;
  /** 상위 10%가 얼마나 늦는가 — 중앙값만 보면 "가끔 아주 늦는 사람"이 안 보인다 */
  p90Minutes: number | null;
  lastRoomAt: string | null;
}

/** 정렬 축. 서버(104)가 화이트리스트로 검증하므로 이 유니온과 값이 일치해야 한다. */
export type HostResponseOrder =
  | "rate_asc"
  | "rate_desc"
  | "median_asc"
  | "median_desc"
  | "rooms_desc"
  | "unanswered_desc";

export interface HostResponsePage {
  rows: HostResponseItem[];
  /** 페이지가 아니라 **전체** 모임장 수 */
  total: number;
  /**
   * 표 위 경고문에 쓰는 메타. 행이 없으면 null —
   * 104 가 메타를 행에 실어 보내므로 행이 없으면 알 길이 없다.
   */
  meta: {
    /** 실제로 센 시작일. 파기된 구간은 셀 수 없어 여기서 끊긴다 */
    windowFrom: string;
    windowCapped: boolean;
    /** host_user_id 가 없어 누구 점수인지 모르는 방 */
    excludedNoHost: number;
    /** 모임장이 먼저 말 건 방 — 유저의 답장이 모임장 점수가 되면 안 된다 */
    excludedHostInitiated: number;
  } | null;
}

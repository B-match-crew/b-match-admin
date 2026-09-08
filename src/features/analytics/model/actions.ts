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

// ─── 재방문·방문일수·휴면 (migration 106) ───

/**
 * 유저 그룹. 서버(106)가 화이트리스트로 받으므로 값이 일치해야 한다.
 * 셋의 합이 전체와 같다 — 호스트가 아니면 전부 GENERAL 이다(비회원 포함).
 */
export type RetentionGroup = "ALL" | "HOST" | "GENERAL";

/**
 * 주차 코호트별 N일 내 재방문.
 *
 * 🔴 `d7`/`d14`/`d30` 은 **창마다 분모가 다르다.** 아직 N일이 안 지난 기기는
 * 그 창의 분모에서 빠지므로, 비율이 null 이면 "0%" 가 아니라 **"아직 집계할 수
 * 없음"** 이다. 화면이 이 둘을 같게 그리면 최근 코호트가 항상 0% 로 보인다.
 */
export interface RevisitCohortItem {
  week: string;
  /** 그 주에 처음 앱을 연 기기 수 (성숙 여부와 무관) */
  size: number;
  /** 창이 다 찬 기기 수 = 그 비율의 분모 */
  mature7: number;
  mature14: number;
  mature30: number;
  /** 비율(%). null = 분모가 0 (아직 집계 불가) */
  d7: number | null;
  d14: number | null;
  d30: number | null;
}

/** 최초 실행 후 창 안의 서로 다른 방문일 수 분포. 1 = D0 에만 왔다. */
export interface VisitDaysItem {
  days: number;
  devices: number;
  /** 그 창에서 차지하는 비율(%) */
  share: number;
}

/**
 * 휴면 — 마지막 활성으로부터 N일 이상 경과(누적).
 *
 * `devices` 는 기기, `members`/`hosts` 는 **사람** 단위다. 기기로 회원을 세면
 * 두 대 쓰는 사람이 한쪽만 쉬어도 휴면으로 잡힌다.
 */
export interface DormantItem {
  bucket: "D7" | "D14" | "D30";
  minDays: number;
  devices: number;
  /** 그중 2일 이상 방문한 적 있는 기기 — 이게 진짜 이탈이다 */
  devicesReturning: number;
  members: number;
  hosts: number;
  /** 전체 기기 대비 휴면율(%) — "한 번 켜보고 만" 사용자에 지배된다 */
  rateAll: number | null;
  /** 2일 이상 방문 기기 대비 휴면율(%) — 이쪽을 봐야 한다 */
  rateReturning: number | null;
}

export interface DormantSummary {
  rows: DormantItem[];
  baseDevices: number;
  baseReturning: number;
  baseMembers: number;
  baseHosts: number;
}

// ─── 주차별 방문일수 · 코호트 커버리지 (migration 107·108) ───

/**
 * 주차 코호트별 방문일 수 분포.
 *
 * `share` 는 **그 주 안에서의** 비율이다. `devices` 를 주끼리 비교하면 유입량
 * 차이만 보인다 — 08-10 주 174대와 08-24 주 897대를 나란히 놓으면 형태가 아니라
 * 크기가 보인다.
 */
export interface VisitDaysCohortItem {
  week: string;
  /** 그 주에서 창이 다 찬 기기 수 = 그 주 비율의 분모 */
  cohortSize: number;
  days: number;
  devices: number;
  share: number;
}

/** 주차별로 묶은 분포. 창이 덜 찬 주는 아예 들어오지 않는다. */
export interface VisitDaysCohortWeek {
  week: string;
  cohortSize: number;
  /** days → share. 빠진 days 는 0% */
  bars: { days: number; devices: number; share: number }[];
}

/**
 * 코호트 커버리지 — "이 주차 숫자를 믿어도 되는가".
 *
 * 🔴 107 이 D0 를 관측할 수 없었던 기기(활성 기록 이전 버전으로 설치)를
 * 걸러내는데, 조용히 걸러내면 표본이 왜 얇은지 나중에 설명할 수 없다.
 * 걸러낸 양을 그대로 드러내 화면이 스스로 신뢰도를 말하게 한다.
 */
export interface CohortCoverageItem {
  week: string;
  registered: number;
  observable: number;
  excluded: number;
  /** observable / registered (%) */
  coverage: number | null;
}

// ─── 109 순서 퍼널 · 주간 연락 분리 ───

/** 같은 기기가 직전 단계 이후 기한 안에 간 것만 센 퍼널 한 단계 */
export interface InquiryFunnelStep {
  stepOrder: number;
  stepName: string;
  devices: number;
  /** 직전 단계 대비 (%). 첫 단계는 null */
  convFromPrev: number | null;
  /** 직전 단계로부터 걸린 시간 중앙값(시간). 첫 단계는 null */
  medianHours: number | null;
  /** 채팅 보관 기간으로 잘린 실제 시작일 — 요청한 from 보다 뒤일 수 있다 */
  windowFrom: string;
}

/**
 * 주간 연락 3단 분리.
 * 🔴 intent 는 **기기**, inquirers 는 **사람** — 비율로 잇지 말 것. 전환은 퍼널이 센다.
 */
export interface InquiryWeeklyItem {
  week: string;
  intentDevices: number;
  intentMembers: number;
  inquirers: number;
  replied: number;
  inquiryRooms: number;
}

// ─── 110 지역별 매칭 가능성 ───

export interface RegionPotentialItem {
  region: string;
  /** 운동 예정일이 기간 안인 모집글 */
  listings: number;
  hosts: number;
  searchers: number;
  searches: number;
  emptyResults: number;
  emptyRate: number | null;
  inquiredListings: number;
  inquiryRate: number | null;
  /** 검색 기기 1대당 모집글. 낮을수록 공급 부족 */
  listingsPerSearcher: number | null;
}

// ─── 111 모임장 공급 유지 ───

export interface HostOnboardingLag {
  hostsRegistered: number;
  hostsListed: number;
  hostsInquired14d: number;
  medianLagHours: number | null;
  p90LagHours: number | null;
}

export interface HostReregistrationItem {
  week: string;
  hosts: number;
  reregistered28d: number;
  rate: number | null;
}

export interface SupplyConcentrationItem {
  rank: number;
  hostId: number;
  clubName: string | null;
  listings: number;
  share: number;
  cumShare: number;
}

// ─── 112 경험별 · 첫검색별 재방문 ───

export type Experience =
  | "replied"
  | "inquired_no_reply"
  | "favorited"
  | "viewed_only"
  | "list_only";

export interface RevisitByExperienceItem {
  experience: Experience;
  rank: number;
  devices: number;
  revisited830: number;
  rate: number | null;
}

export interface RevisitByFirstSearchItem {
  firstSearch: "empty" | "had_results" | "no_search";
  devices: number;
  revisited7: number;
  rate: number | null;
}

// ─── 113 운영 신호 ───

export interface CreateAbandonStep {
  lastStep: number;
  abandons: number;
  devices: number;
  starts: number;
  completes: number;
}

export interface PushPermissionFunnel {
  primed: number;
  accepted: number;
  later: number;
  granted: number;
  denied: number;
  hostsTotal: number;
  /** 🔴 하한선 — 권한 요청 순간의 기록만 있다 */
  hostsDeniedKnown: number;
  hostsNoSignal: number;
}

export interface ReplyLatencyItem {
  bucket: string;
  rank: number;
  rooms: number;
  inquirers: number;
  reinquired: number;
  rate: number | null;
}

export interface PushReactivationItem {
  pushType: string;
  opens: number;
  devices: number;
  reactivated: number;
  retained7d: number;
  reactivationRate: number | null;
  retentionRate: number | null;
}

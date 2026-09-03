/**
 * stats — actions 의 응답·입력 모델.
 *
 * "use server" 파일은 값으로 async 함수만 내보낼 수 있어, 타입이 조회 함수
 * 사이사이에 끼어 있었다. model 세그먼트로 꺼내면 상수도 같은 자리에 둘 수
 * 있고(그래서 constants.ts 를 따로 두던 우회가 사라진다), 화면이 조회 구현을
 * 끌어오지 않고 모양만 볼 수 있다.
 */

export interface DailyAcquisitionItem {
  date: string; // yyyy-MM-dd (KST)
  guests: number;
  signups: number;
  /**
   * 일별 비율(%) = 가입수 / 게스트수 × 100.
   *
   * ⚠️ 코호트 전환율이 아니다. guest_devices 와 users 는 연결돼 있지 않아
   * 같은 사람을 추적할 수 없고, 설치일과 가입일이 다르면 분모·분자가 다른
   * 날에 잡힌다. 게스트가 0인 날은 null (0으로 나누지 않는다).
   */
  ratio: number | null;
}

export interface CumulativePoint {
  date: string; // yyyy-MM-dd (KST)
  cumGuests: number;
  cumSignups: number;
}

export interface CumulativeTrend {
  /** 전체 기간 누계 (all-time) */
  totalGuests: number;
  totalSignups: number;
  /** 기간 내 누적 곡선 — 마지막 점 = all-time 누계 */
  series: CumulativePoint[];
  /** 최근일 신규 유입 수 */
  guestsToday: number;
  signupsToday: number;
  /** 전일 대비 증감률(%) — 전일 0이면 null (0으로 나누지 않음) */
  guestsDodPct: number | null;
  signupsDodPct: number | null;
}

export interface DistributionItem {
  bucket: string;
  count: number;
  /** 전체 대비 비중(%) */
  share: number;
}

export interface Demographics {
  gender: DistributionItem[];
  age: DistributionItem[];
  level: DistributionItem[];
}

export interface HostStats {
  totalUsers: number;
  totalHosts: number;
  /** 실제로 모임을 개설한 호스트 수 (is_host 이지만 미개설인 경우가 있다) */
  hostsWithMatch: number;
  totalMatches: number;
  avgMatchesPerHost: number;
  /** 호스트 전환율(%) = 호스트 수 / 전체 유저 수 */
  hostConversionRate: number;
}

export interface RegionItem {
  region: string;
  matches: number;
  hosts: number;
  recruiting: number;
  /** 전체 모임 대비 비중(%) */
  share: number;
}

export interface ReportSummary {
  total: number;
  pending: number;
  reviewed: number;
  actioned: number;
  dismissed: number;
  medianHoursToResolve: number | null;
  /** 신고율(%) = 신고된 매칭 / 전체 매칭 */
  reportRate: number | null;
}

export interface ReportHostItem {
  host_id: number;
  nickname: string | null;
  name: string | null;
  user_status: string;
  reportCount: number;
  reporterCount: number;
}

export interface PopularMatchItem {
  id: number;
  title: string;
  region_1: string | null;
  view_count: number;
  favorite_count: number;
}

export interface TimeCell {
  dow: number; // 0=일 … 6=토
  hour: number; // 0-23
  cnt: number;
}

export interface SignupChannels {
  providers: DistributionItem[];
  marketingOptInRate: number | null;
  marketingOptInCount: number;
  totalUsers: number;
}

export interface ChatDailyPoint {
  day: string; // yyyy-MM-dd (KST)
  messages: number;
  rooms: number;
  senders: number;
}

/**
 * 응답 지표 (app migration 90).
 *
 * 90 이 적용되지 않은 DB 에서는 이 값이 통째로 없다 — 88 만 있어도 화면이
 * 죽지 않도록 null 로 두고, 화면은 카드를 감춘다. 0% 로 그리면 "아무도 답을
 * 안 한다" 로 읽힌다.
 */
export interface ChatResponseStats {
  /** 응답 지표를 실제로 센 시작일 (yyyy-MM-dd, KST) */
  from: string;
  /**
   * 요청한 기간이 남아 있는 기록보다 넓어 잘렸는가.
   *
   * 보관 기간이 지난 대화는 지워지므로 그 구간에서는 답장이 이미 없다. 세면
   * 응답률이 실제보다 낮게 나오고, 그 숫자로 모임장을 평가하게 된다.
   */
  windowCapped: boolean;
  /** 분모 — 창 안에서 새로 열린 방 */
  rooms: number;
  /** 문의받은 쪽이 한 번이라도 보낸 방 */
  answered: number;
  /** 미응답이지만 아직 24시간이 안 지난 방 = 판정 유보 */
  unansweredRecent: number;
  /** 첫 응답까지 걸린 시간의 중앙값(분). 답한 방이 없으면 null */
  medianMinutes: number | null;
}

export interface ChatStats {
  /**
   * 채팅 스키마가 있는 DB 인지.
   *
   * 채팅(61~87)은 앱 릴리즈가 늦어 **prod 에 아직 없다.** 없는 테이블을 읽으면
   * 화면이 통째로 에러가 되므로, 서버가 존재 여부를 판정해 내려준다.
   */
  available: boolean;
  roomsTotal: number;
  roomsActive: number;
  roomsClosed: number;
  /** 열렸지만 한 마디도 오가지 않은 방 */
  roomsEmpty: number;
  messagesTotal: number;
  messagesRanged: number;
  /** 기간 내 시스템 메시지(일정 안내·나가기 안내) */
  messagesSystem: number;
  sendersRanged: number;
  roomsRanged: number;
  /**
   * 기간 내 **새로 열린** 방 = 신규 문의 건수.
   *
   * 방은 유저가 첫 메시지를 보내는 순간 만들어지므로(app migration 82) 모임장
   * 답장 여부와 무관하다. roomsRanged(메시지가 오간 방)와 다른 값이다 —
   * 저쪽은 예전에 열린 방의 대화도 센다.
   */
  roomsCreated: number;
  daily: ChatDailyPoint[];
  /** 90 미적용 DB 에서는 null */
  response: ChatResponseStats | null;
  reportsTotal: number;
  reportsPending: number;
}

/**
 * analytics — ga4 의 응답·입력 모델.
 *
 * "use server" 파일은 값으로 async 함수만 내보낼 수 있어, 타입이 조회 함수
 * 사이사이에 끼어 있었다. model 세그먼트로 꺼내면 상수도 같은 자리에 둘 수
 * 있고(그래서 constants.ts 를 따로 두던 우회가 사라진다), 화면이 조회 구현을
 * 끌어오지 않고 모양만 볼 수 있다.
 */

/** 설정이 안 됐을 때 화면이 죽지 않도록, 데이터 대신 이 상태를 돌려준다. */
export interface Ga4Unavailable {
  configured: false;
  reason: string;
}

export interface Ga4Result<T> {
  configured: true;
  rows: T[];
  /** GA4 가 표본 추출을 했는지 — 했다면 수치를 추세로만 읽어야 한다. */
  sampled: boolean;
}

export type Ga4Response<T> = Ga4Result<T> | Ga4Unavailable;

export interface ChannelItem {
  source: string;
  medium: string;
  newUsers: number;
  totalUsers: number;
}

export interface CampaignItem {
  campaign: string;
  source: string;
  newUsers: number;
  /** 가입 완료 수 — 앱에서 심은 sign_up_complete 이벤트. */
  signUps: number;
}

export interface PlatformItem {
  platform: string;
  activeUsers: number;
  sessions: number;
  /** 세션당 평균 참여 시간(초). */
  avgEngagementSec: number;
}

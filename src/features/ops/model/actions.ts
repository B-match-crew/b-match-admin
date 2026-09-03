/**
 * ops — actions 의 응답·입력 모델.
 *
 * "use server" 파일은 값으로 async 함수만 내보낼 수 있어, 타입이 조회 함수
 * 사이사이에 끼어 있었다. model 세그먼트로 꺼내면 상수도 같은 자리에 둘 수
 * 있고(그래서 constants.ts 를 따로 두던 우회가 사라진다), 화면이 조회 구현을
 * 끌어오지 않고 모양만 볼 수 있다.
 */

export interface CronJob {
  jobname: string;
  schedule: string;
  active: boolean;
  lastStart: string | null;
  lastEnd: string | null;
  lastStatus: string | null;
  lastMessage: string | null;
}

export interface PushBacklog {
  /** 지금 PENDING 인 알림 수 */
  pendingTotal: number;
  /** 그중 기준 시간(기본 15분)보다 오래된 것 — 0 이 아니면 파이프라인이 멈춘 것 */
  pendingStale: number;
  /** 가장 오래된 PENDING 의 생성 시각 */
  oldestPending: string | null;
}

export interface EventName {
  eventName: string;
  cnt: number;
  users: number;
  devices: number;
  lastSeen: string;
}

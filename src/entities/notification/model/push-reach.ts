/**
 * 푸시가 실제로 닿는 사람 수.
 *
 * "발송 대상"과 "도달 가능"은 다르다 — 정회원이어도 유효 토큰이 없으면 닿지
 * 않는다. 공지 발송 화면(notices)과 알림 운영 화면(notifications)이 같은 수를
 * 봐야 하므로 어느 feature 도 소유하지 않는다.
 */
export interface PushReach {
  /** 발송 대상(정회원) 수 — app migration 47 의 미리보기와 같은 정의 */
  targetAll: number;
  targetHost: number;
  /** 그 중 유효 토큰을 가진 사람 = **실제 푸시가 닿는 수** */
  reachableAll: number;
  reachableHost: number;
  tokensTotal: number;
  tokenUsers: number;
  byOs: { os: string; tokens: number; users: number }[];
  /** 30일 넘게 안 쓰인 토큰 — 앱 삭제/재설치로 죽었을 가능성 */
  staleTokens: number;
}

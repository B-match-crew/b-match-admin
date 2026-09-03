/**
 * compliance — actions 의 응답·입력 모델.
 *
 * "use server" 파일은 값으로 async 함수만 내보낼 수 있어, 타입이 조회 함수
 * 사이사이에 끼어 있었다. model 세그먼트로 꺼내면 상수도 같은 자리에 둘 수
 * 있고(그래서 constants.ts 를 따로 두던 우회가 사라진다), 화면이 조회 구현을
 * 끌어오지 않고 모양만 볼 수 있다.
 */

export interface AgreementStat {
  agreement: string;
  agreed: number;
  notAgreed: number;
  versions: string[];
}

export interface MarketingStat {
  /** users.marketing_opt_in (비정규화 미러) */
  mirrorOptIn: number;
  /** marketing_consents 최신 행 기준 동의자 (정본) */
  latestAgreed: number;
  historyRows: number;
  /** 미러와 정본이 어긋난 유저 수 — 0 이 아니면 트리거를 우회한 경로가 있다 */
  mirrorMismatch: number;
  /** 최신 동의가 2년 지난 수신 동의자 (정보통신망법 §50⑧) */
  reconfirmDue: number;
  bySource: { source: string; agreed: number; revoked: number }[];
}

export interface ConsentSummary {
  members: number;
  byAgreement: AgreementStat[];
  /** 필수 4종이 모두 기록된 정회원 수 */
  fullyRecorded: number;
  bySource: { source: string; cnt: number }[];
  marketing: MarketingStat;
}

export interface PurgeStatus {
  /** 탈퇴 30일 경과 = 지금 파기돼야 할 계정 */
  accountsDue: number;
  /** 모임만 삭제된 호스트의 고아 커버 이미지 */
  coversDue: number;
  /** 탈퇴했지만 아직 30일이 안 된 계정 (대기열) */
  accountsWaiting: number;
  marketingReconfirmDue: number;
  /**
   * 파기 대상 방에 남아 있는 채팅 메시지. 채팅 미적용 DB 에서는 null.
   *
   * 기준이 바뀌었다(app migration 91, 약관 2026-08-31) — 예전에는 "30일 지난
   * 메시지"였고 지금은 **"마지막 대화로부터 90일이 지난 방"의 메시지 전부**다.
   * 최근에 대화한 방은 아무리 옛 메시지라도 대상이 아니다.
   */
  chatMessagesDue: number | null;
  /** 위 메시지들이 속한 방 수. 실제 삭제 단위는 방이다. */
  chatRoomsDue: number | null;
  /** 처리 완료 1년 경과 채팅 신고 (app migration 92) */
  chatReportsDue: number | null;
  /** 처리 완료 1년 경과 매칭 신고 (app migration 92) */
  matchReportsDue: number;
}

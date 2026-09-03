/**
 * chat-reports — actions 의 응답·입력 모델.
 *
 * "use server" 파일은 값으로 async 함수만 내보낼 수 있어, 타입이 조회 함수
 * 사이사이에 끼어 있었다. model 세그먼트로 꺼내면 상수도 같은 자리에 둘 수
 * 있고(그래서 constants.ts 를 따로 두던 우회가 사라진다), 화면이 조회 구현을
 * 끌어오지 않고 모양만 볼 수 있다.
 */

import type { ReportStatus, UserStatus } from "@/src/shared/types/db";

/**
 * 신고 시점에 **복사해 둔** 대화 한 줄 (`chat_reports.snapshot`).
 *
 * 참조가 아니라 복사인 이유: 원본 대화는 30일에 파기된다(app migration 63).
 * 참조로 뒀다면 운영자가 검토할 때 증적이 이미 사라져 있다.
 *
 * `sender_id === null` 은 **시스템 메시지**(일정 안내)다 — 앱과 같은 규약이며,
 * 이 NULL 을 "탈퇴한 유저" 로 읽으면 안 된다.
 */
export interface ChatSnapshotMessage {
  id: number;
  sender_id: number | null;
  kind: "TEXT" | "SCHEDULE_NOTICE";
  body: string;
  created_at: string;
}

/**
 * 채팅 신고 1행. `chat_reports` 를 신고자/피신고자와 합친 형태.
 *
 * 매칭글 신고(`match_reports`)와 **테이블이 다르다.** 신고 대상이 글이 아니라
 * 대화라, 검토에 필요한 것이 "어떤 글인가"가 아니라 "무슨 말이 오갔나"다.
 * 그래서 여기엔 매칭 정보 대신 [snapshot] 이 있다.
 *
 * 조인은 매칭 신고와 같은 이유로 **수동**이다 — users 로 가는 FK 가 2개
 * (reporter_id, target_id)라 PostgREST 임베드는 제약 이름을 요구한다.
 */
export interface ChatReportListItem {
  id: number;
  status: ReportStatus;
  reason: string;
  detail: string | null;
  created_at: string;
  /** 방이 파기되면 null 이 된다(ON DELETE SET NULL). 신고 이력 자체는 남는다. */
  room_id: number | null;
  reporter_id: number;
  reporter: { nickname: string | null; name: string | null } | null;
  target_id: number;
  target: {
    id: number;
    nickname: string | null;
    name: string | null;
    user_status: UserStatus;
  } | null;
  snapshot: ChatSnapshotMessage[];
  /** 같은 유저가 피신고된 총 건수(현재 조회 범위 기준) */
  targetReportCount: number;
}

export interface ChatReportSearchParams {
  status?: ReportStatus | "ALL";
  limit?: number;
}

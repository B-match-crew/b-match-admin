/**
 * users — actions 의 응답·입력 모델.
 *
 * "use server" 파일은 값으로 async 함수만 내보낼 수 있어, 타입이 조회 함수
 * 사이사이에 끼어 있었다. model 세그먼트로 꺼내면 상수도 같은 자리에 둘 수
 * 있고(그래서 constants.ts 를 따로 두던 우회가 사라진다), 화면이 조회 구현을
 * 끌어오지 않고 모양만 볼 수 있다.
 */

import type { DbUser } from "@/src/shared/types/db";

export interface UserSearchParams {
  term?: string;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}

export interface UserSearchResult {
  rows: UserListItem[];
  total: number;
}

export type UserListItem = Pick<
  DbUser,
  | "id"
  | "name"
  | "nickname"
  | "phone_number"
  | "user_status"
  | "is_host"
  | "admin_role"
  | "suspended_until"
  | "suspended_reason"
  | "created_at"
  | "deleted_at"
>;

export interface UserDetail {
  user: DbUser;
  /**
   * 이 유저가 개설한 모임(host_profiles). 유저당 최대 1개
   * (uk_host_profiles_user). 없으면 null — is_host 여도 개설 전이면 없을 수 있다.
   */
  club: {
    id: number;
    club_name: string;
    deleted_at: string | null;
  } | null;
  auditHistory: Array<{
    action_type: string;
    reason: string | null;
    created_at: string;
  }>;
  /**
   * 이 유저가 **차단당한** 횟수. 차단은 신고와 달리 운영자에게 아무 신호를
   * 주지 않아서, 상세 화면에 숫자로라도 있어야 사각지대가 줄어든다.
   */
  blockedCount: number;
  /** 이 유저의 모집글이 신고당한 횟수 */
  reportedCount: number;
  /**
   * 참여 중인 채팅방 수. **채팅 스키마가 없는 환경에서는 null** —
   * 채팅(61~87)은 앱 릴리즈가 늦어 아직 없는 DB 가 있고, 그 때문에 유저 상세
   * 전체가 못 열리면 안 된다.
   */
  chatRoomCount: number | null;
}

/**
 * clubs — actions 의 응답·입력 모델.
 *
 * "use server" 파일은 값으로 async 함수만 내보낼 수 있어, 타입이 조회 함수
 * 사이사이에 끼어 있었다. model 세그먼트로 꺼내면 상수도 같은 자리에 둘 수
 * 있고(그래서 constants.ts 를 따로 두던 우회가 사라진다), 화면이 조회 구현을
 * 끌어오지 않고 모양만 볼 수 있다.
 */

import type { DbHostProfile, DbUser } from "@/src/shared/types/db";

export interface ClubListItem
  extends Pick<
    DbHostProfile,
    | "id"
    | "user_id"
    | "club_name"
    | "min_level_required"
    | "gender_ratio_male"
    | "gender_ratio_female"
    | "created_at"
    | "deleted_at"
  > {
  host: Pick<DbUser, "nickname" | "name"> | null;
  /** 이 모임(user_id)이 올린 매칭 수 — 삭제 포함/제외는 파라미터로 */
  matchCount: number;
  activeMatchCount: number;
}

export interface ClubSearchParams {
  term?: string;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}

export interface ClubSearchResult {
  rows: ClubListItem[];
  total: number;
}

export type ClubDetail = DbHostProfile & {
  host: Pick<DbUser, "id" | "nickname" | "name" | "phone_number"> | null;
  matchCount: number;
  activeMatchCount: number;
};

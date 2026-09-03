/**
 * matches — actions 의 응답·입력 모델.
 *
 * "use server" 파일은 값으로 async 함수만 내보낼 수 있어, 타입이 조회 함수
 * 사이사이에 끼어 있었다. model 세그먼트로 꺼내면 상수도 같은 자리에 둘 수
 * 있고(그래서 constants.ts 를 따로 두던 우회가 사라진다), 화면이 조회 구현을
 * 끌어오지 않고 모양만 볼 수 있다.
 */

import type { DbMatch, DbUser, MatchStatus } from "@/src/shared/types/db";

export interface MatchListItem
  extends Pick<
    DbMatch,
    | "id"
    | "title"
    | "host_id"
    | "start_time"
    | "location_name"
    | "region_1"
    | "status"
    | "view_count"
    | "favorite_count"
    | "created_at"
    | "deleted_at"
  > {
  host: Pick<DbUser, "nickname" | "name"> | null;
}

/** 정렬 기준 — 모집(시작) 일자순 | 최신 등록순 */
export type MatchSortBy = "start_time" | "created_at";

export interface MatchSearchParams {
  status?: MatchStatus | "ALL";
  includeDeleted?: boolean;
  sortBy?: MatchSortBy;
  limit?: number;
  offset?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface MatchSearchResult {
  rows: MatchListItem[];
  total: number;
}

export type MatchDetail = DbMatch & {
  host: Pick<DbUser, "id" | "nickname" | "name"> | null;
};

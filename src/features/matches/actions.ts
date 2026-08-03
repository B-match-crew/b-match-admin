"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { requireAdmin } from "@/src/shared/lib/role-guard";
import { rpcDeleteMatch } from "@/src/shared/api/rpc";
import { REASON_MIN_LENGTH } from "@/src/shared/config/constants";
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

export async function fetchMatches(
  params: MatchSearchParams
): Promise<MatchSearchResult> {
  await requireAdmin();
  const supabase = createAdminClient();
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  let q = supabase
    .from("matches")
    .select(
      `id, title, host_id, start_time, location_name, region_1, status, view_count, favorite_count, created_at, deleted_at,
       host:users!fk_matches_host(nickname, name)`,
      { count: "exact" }
    )
    .order(params.sortBy ?? "start_time", { ascending: false })
    .range(offset, offset + limit - 1);

  if (params.status && params.status !== "ALL") {
    q = q.eq("status", params.status);
  }
  if (!params.includeDeleted) {
    q = q.is("deleted_at", null);
  }
  if (params.dateFrom) {
    q = q.gte("start_time", params.dateFrom);
  }
  if (params.dateTo) {
    q = q.lte("start_time", params.dateTo);
  }

  const { data, error, count } = await q;
  if (error) throw error;
  return {
    rows: (data ?? []) as unknown as MatchListItem[],
    total: count ?? 0,
  };
}

// ─── 매칭 상세 ───

export type MatchDetail = DbMatch & {
  host: Pick<DbUser, "id" | "nickname" | "name"> | null;
};

export async function fetchMatchDetail(matchId: number): Promise<MatchDetail> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      `*, host:users!fk_matches_host(id, nickname, name)`
    )
    .eq("id", matchId)
    .single();
  if (error) throw error;
  return data as unknown as MatchDetail;
}

// ─── 액션 ───

export async function deleteMatchAction(p: { matchId: number; reason: string }) {
  if (p.reason.trim().length < REASON_MIN_LENGTH) {
    throw new Error(`사유는 ${REASON_MIN_LENGTH}자 이상 입력해야 합니다`);
  }
  await requireAdmin("SUPER_ADMIN");
  await rpcDeleteMatch({ matchId: p.matchId, reason: p.reason });
  revalidatePath("/matches");
}

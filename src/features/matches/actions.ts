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
    | "created_at"
    | "deleted_at"
  > {
  host: Pick<DbUser, "nickname" | "name"> | null;
}

export interface MatchSearchParams {
  status?: MatchStatus | "ALL";
  includeDeleted?: boolean;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}

export async function fetchMatches(
  params: MatchSearchParams
): Promise<MatchListItem[]> {
  await requireAdmin();
  const supabase = createAdminClient();
  const limit = params.limit ?? 50;

  let q = supabase
    .from("matches")
    .select(
      `id, title, host_id, start_time, location_name, region_1, status, view_count, created_at, deleted_at,
       host:users!fk_matches_host(nickname, name)`
    )
    .order("start_time", { ascending: false })
    .limit(limit);

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

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as MatchListItem[];
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

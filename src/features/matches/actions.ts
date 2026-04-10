"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { requireAdmin } from "@/src/shared/lib/role-guard";
import { rpcDeleteMatch, rpcUnblindPost } from "@/src/shared/api/rpc";
import { REASON_MIN_LENGTH } from "@/src/shared/config/constants";
import type { DbMatch, DbPost, DbUser, MatchStatus } from "@/src/shared/types/db";

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
    | "is_deleted"
    | "created_at"
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
      `id, title, host_id, start_time, location_name, region_1, status, is_deleted, created_at,
       host:users!matches_host_id_fkey(nickname, name)`
    )
    .order("start_time", { ascending: false })
    .limit(limit);

  if (params.status && params.status !== "ALL") {
    q = q.eq("status", params.status);
  }
  if (!params.includeDeleted) {
    q = q.eq("is_deleted", false);
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
      `*, host:users!matches_host_id_fkey(id, nickname, name)`
    )
    .eq("id", matchId)
    .single();
  if (error) throw error;
  return data as unknown as MatchDetail;
}

// ─── 블라인드 게시글 ───

export interface BlindedPostItem
  extends Pick<DbPost, "id" | "title" | "content" | "is_blind" | "created_at"> {
  author: Pick<DbUser, "id" | "nickname" | "name"> | null;
}

export async function fetchBlindedPosts(): Promise<BlindedPostItem[]> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, title, content, is_blind, created_at, author:users!posts_author_id_fkey(id, nickname, name)"
    )
    .eq("is_blind", true)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as BlindedPostItem[];
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

export async function unblindPostAction(p: { postId: number; reason: string }) {
  if (p.reason.trim().length < REASON_MIN_LENGTH) {
    throw new Error(`사유는 ${REASON_MIN_LENGTH}자 이상 입력해야 합니다`);
  }
  await requireAdmin("MANAGER");
  await rpcUnblindPost({ postId: p.postId, reason: p.reason });
  revalidatePath("/matches");
}

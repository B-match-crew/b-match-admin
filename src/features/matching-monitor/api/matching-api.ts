import type { SupabaseClient } from "@supabase/supabase-js";
import type { Match, MatchStatus } from "@/src/entities/matching/types";

interface FetchMatchesParams {
  search?: string;
  status?: "all" | MatchStatus;
  page?: number;
  limit?: number;
}

interface FetchMatchesResult {
  matches: Match[];
  totalCount: number;
}

export async function fetchMatchings(
  supabase: SupabaseClient,
  {
    search,
    status = "all",
    page = 1,
    limit = 20,
  }: FetchMatchesParams
): Promise<FetchMatchesResult> {
  let query = supabase
    .from("matches")
    .select("*, host:users!matches_host_id_fkey(nickname, real_name)", { count: "exact" });

  if (search && search.trim()) {
    query = query.or(
      `title.ilike.%${search}%,location_name.ilike.%${search}%`
    );
  }

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`매칭 목록 조회 실패: ${error.message}`);
  }

  return {
    matches: (data as Match[]) ?? [],
    totalCount: count ?? 0,
  };
}

export async function fetchMatchingById(
  supabase: SupabaseClient,
  matchId: string
): Promise<Match> {
  const { data, error } = await supabase
    .from("matches")
    .select("*, host:users!matches_host_id_fkey(nickname, real_name)")
    .eq("id", matchId)
    .single();

  if (error) {
    throw new Error(`매칭 조회 실패: ${error.message}`);
  }

  return data as Match;
}

export async function deleteMatching(
  supabase: SupabaseClient,
  matchId: string
): Promise<void> {
  const { error } = await supabase
    .from("matches")
    .update({
      status: "CANCELED_BY_ADMIN",
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId);

  if (error) {
    throw new Error(`매칭 취소 실패: ${error.message}`);
  }
}

export async function adminCancelMatch(
  supabase: SupabaseClient,
  matchId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase.rpc("rpc_admin_cancel_match", {
    p_match_id: matchId,
    p_reason: reason,
  });

  if (error) {
    throw new Error(`직권 취소 실패: ${error.message}`);
  }
}

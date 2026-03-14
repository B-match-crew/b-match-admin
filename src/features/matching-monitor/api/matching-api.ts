import type { SupabaseClient } from "@supabase/supabase-js";
import type { Matching } from "@/src/entities/matching/types";

interface FetchMatchingsParams {
  search?: string;
  status?: "all" | "모집중" | "마감" | "종료" | "취소";
  page?: number;
  limit?: number;
}

interface FetchMatchingsResult {
  matchings: Matching[];
  totalCount: number;
}

export async function fetchMatchings(
  supabase: SupabaseClient,
  {
    search,
    status = "all",
    page = 1,
    limit = 20,
  }: FetchMatchingsParams
): Promise<FetchMatchingsResult> {
  let query = supabase
    .from("matchings")
    .select("*", { count: "exact" });

  // 검색 필터
  if (search && search.trim()) {
    query = query.or(
      `title.ilike.%${search}%,host_name.ilike.%${search}%,location.ilike.%${search}%`
    );
  }

  // 상태 필터
  if (status !== "all") {
    query = query.eq("recruitment_status", status);
  }

  // 페이지네이션
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`매칭 목록 조회 실패: ${error.message}`);
  }

  return {
    matchings: (data as Matching[]) ?? [],
    totalCount: count ?? 0,
  };
}

export async function fetchMatchingById(
  supabase: SupabaseClient,
  matchingId: string
): Promise<Matching> {
  const { data, error } = await supabase
    .from("matchings")
    .select("*")
    .eq("id", matchingId)
    .single();

  if (error) {
    throw new Error(`매칭 조회 실패: ${error.message}`);
  }

  return data as Matching;
}

export async function deleteMatching(
  supabase: SupabaseClient,
  matchingId: string
): Promise<void> {
  const { error } = await supabase
    .from("matchings")
    .update({
      recruitment_status: "취소",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchingId);

  if (error) {
    throw new Error(`매칭 삭제 실패: ${error.message}`);
  }
}

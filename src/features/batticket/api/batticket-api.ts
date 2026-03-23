import type { SupabaseClient } from "@supabase/supabase-js";
import type { BadticketEvent, BadticketReason } from "@/src/entities/battiket/types";

interface UserBatticketRow {
  id: string;
  nickname: string;
  real_name: string | null;
  badticket_score: number;
  status: string;
  is_host: boolean;
}

interface FetchBatticketUsersParams {
  search?: string;
  page?: number;
  limit?: number;
}

interface FetchBatticketUsersResult {
  users: UserBatticketRow[];
  totalCount: number;
}

export async function fetchBatticketUsers(
  supabase: SupabaseClient,
  { search, page = 1, limit = 20 }: FetchBatticketUsersParams
): Promise<FetchBatticketUsersResult> {
  let query = supabase
    .from("users")
    .select("id, nickname, real_name, badticket_score, status, is_host", {
      count: "exact",
    });

  if (search && search.trim()) {
    query = query.or(
      `nickname.ilike.%${search}%,real_name.ilike.%${search}%`
    );
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.order("badticket_score", { ascending: true }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`배티켓 사용자 조회 실패: ${error.message}`);
  }

  return {
    users: (data as UserBatticketRow[]) ?? [],
    totalCount: count ?? 0,
  };
}

interface FetchBatticketEventsParams {
  userId: string;
  page?: number;
  limit?: number;
}

interface FetchBatticketEventsResult {
  events: BadticketEvent[];
  totalCount: number;
}

export async function fetchBatticketEvents(
  supabase: SupabaseClient,
  { userId, page = 1, limit = 30 }: FetchBatticketEventsParams
): Promise<FetchBatticketEventsResult> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await supabase
    .from("badticket_events")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`배티켓 이벤트 조회 실패: ${error.message}`);
  }

  return {
    events: (data as BadticketEvent[]) ?? [],
    totalCount: count ?? 0,
  };
}

export const REASON_LABELS: Record<BadticketReason, string> = {
  EVAL_GREAT: "최고 평가",
  EVAL_NORMAL: "보통 평가",
  EVAL_BAD: "아쉬움 평가",
  PENALTY_UNPAID: "미결제 패널티",
  PENALTY_GIVEUP: "참가 포기 패널티",
  PENALTY_NOSHOW: "노쇼 패널티",
  PENALTY_HOST_CANCEL: "호스트 취소 패널티",
  PENALTY_HOST_NEGLECT: "호스트 방치 패널티",
  ADMIN_ADJUST: "관리자 조정",
};

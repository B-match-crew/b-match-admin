import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@/src/entities/user/types";

interface FetchUsersParams {
  search?: string;
  status?: "all" | "active" | "suspended" | "withdrawn";
  role?: "all" | "user" | "host";
  page?: number;
  limit?: number;
}

interface FetchUsersResult {
  users: User[];
  totalCount: number;
}

export async function fetchUsers(
  supabase: SupabaseClient,
  { search, status = "all", role = "all", page = 1, limit = 20 }: FetchUsersParams
): Promise<FetchUsersResult> {
  let query = supabase
    .from("users")
    .select("*", { count: "exact" });

  // 검색 필터
  if (search && search.trim()) {
    query = query.or(
      `nickname.ilike.%${search}%,real_name.ilike.%${search}%,phone_number.ilike.%${search}%`
    );
  }

  // 상태 필터
  if (status === "active") {
    query = query.eq("is_active", true);
  } else if (status === "suspended") {
    query = query.eq("is_active", false);
  }

  // 권한 필터
  if (role === "host") {
    query = query.eq("is_host", true);
  } else if (role === "user") {
    query = query.eq("is_host", false);
  }

  // 페이지네이션
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`유저 목록 조회 실패: ${error.message}`);
  }

  return {
    users: (data as User[]) ?? [],
    totalCount: count ?? 0,
  };
}

export async function updateUserStatus(
  supabase: SupabaseClient,
  userId: string,
  isActive: boolean
): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    throw new Error(`유저 상태 변경 실패: ${error.message}`);
  }
}

export async function adjustBattiketScore(
  supabase: SupabaseClient,
  userId: string,
  scoreChange: number,
  reason: string,
  adminId: string
): Promise<void> {
  // 현재 점수 조회
  const { data: user, error: fetchError } = await supabase
    .from("users")
    .select("battiket_score")
    .eq("id", userId)
    .single();

  if (fetchError) {
    throw new Error(`유저 조회 실패: ${fetchError.message}`);
  }

  const newScore = (user.battiket_score ?? 0) + scoreChange;

  // 점수 업데이트
  const { error: updateError } = await supabase
    .from("users")
    .update({
      battiket_score: newScore,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateError) {
    throw new Error(`점수 조정 실패: ${updateError.message}`);
  }

  // 조정 로그 기록
  const { error: logError } = await supabase
    .from("admin_adjustments")
    .insert({
      user_id: userId,
      admin_id: adminId,
      score_change: scoreChange,
      reason,
    });

  if (logError) {
    throw new Error(`조정 로그 기록 실패: ${logError.message}`);
  }
}

export async function fetchUserById(
  supabase: SupabaseClient,
  userId: string
): Promise<User> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(`유저 조회 실패: ${error.message}`);
  }

  return data as User;
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { User, UserStatus } from "@/src/entities/user/types";

interface FetchUsersParams {
  search?: string;
  status?: "all" | UserStatus;
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
    .select("*, host_profiles(*)", { count: "exact" });

  if (search && search.trim()) {
    query = query.or(
      `nickname.ilike.%${search}%,real_name.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (role === "host") {
    query = query.eq("is_host", true);
  } else if (role === "user") {
    query = query.eq("is_host", false);
  }

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
  newStatus: UserStatus
): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    throw new Error(`유저 상태 변경 실패: ${error.message}`);
  }
}

export async function adjustBattiketScore(
  supabase: SupabaseClient,
  userId: string,
  delta: number,
  reason: string,
  adminId: string
): Promise<void> {
  // v3.0: badticket_events에 INSERT → 트리거가 자동으로 users.badticket_score 갱신
  const { error } = await supabase
    .from("badticket_events")
    .insert({
      user_id: userId,
      delta,
      reason: "ADMIN_ADJUST",
      admin_note: reason,
      is_applied: true,
    });

  if (error) {
    throw new Error(`배티켓 조정 실패: ${error.message}`);
  }

  // 감사 로그 기록
  const { error: auditError } = await supabase
    .from("admin_audit_logs")
    .insert({
      admin_id: adminId,
      action_type: "ADJUST_BADTICKET",
      target_type: "USER",
      target_id: userId,
      reason,
    });

  if (auditError) {
    console.error("감사 로그 기록 실패:", auditError.message);
  }
}

export async function fetchUserById(
  supabase: SupabaseClient,
  userId: string
): Promise<User> {
  const { data, error } = await supabase
    .from("users")
    .select("*, host_profiles(*)")
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(`유저 조회 실패: ${error.message}`);
  }

  return data as User;
}

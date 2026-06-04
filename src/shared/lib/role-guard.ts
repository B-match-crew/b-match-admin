import "server-only";
import type { AdminRole } from "@/src/shared/types/db";
import { createServerSupabase } from "@/src/shared/api/supabase-server";

/**
 * 현재 세션의 관리자 정보. Server Action / Server Component 에서 호출.
 */
export interface CurrentAdmin {
  /** public.users.id (bigint). admin_audit_logs.admin_id 에 들어가는 값. auth uuid 아님! */
  id: number;
  /** auth.users.id (uuid). 세션 식별자 */
  authUserId: string;
  role: AdminRole;
}

/**
 * 세션 → users 테이블에서 admin_role 검증.
 * 세션 유저(auth uuid)는 users.auth_user_id 로 조회한다 (users.id 는 bigint).
 * 관리자 아니면 throw.
 */
export async function requireAdmin(
  minRole: AdminRole = "MANAGER"
): Promise<CurrentAdmin> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("로그인이 필요합니다");
  }

  const { data: me, error } = await supabase
    .from("users")
    .select("id, admin_role, deleted_at")
    .eq("auth_user_id", user.id)
    .single();

  if (error || !me?.admin_role || me.deleted_at) {
    throw new Error("관리자 권한이 없습니다");
  }

  if (minRole === "SUPER_ADMIN" && me.admin_role !== "SUPER_ADMIN") {
    throw new Error("최고 관리자 권한이 필요합니다");
  }

  return {
    id: me.id as number,
    authUserId: user.id,
    role: me.admin_role as AdminRole,
  };
}


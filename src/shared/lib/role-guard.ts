import "server-only";
import type { AdminRole } from "@/src/shared/types/db";
import { createServerSupabase } from "@/src/shared/api/supabase-server";

/**
 * 현재 세션의 관리자 정보. Server Action / Server Component 에서 호출.
 */
export interface CurrentAdmin {
  id: string; // == auth.uid() == users.id
  role: AdminRole;
}

/**
 * 세션 → users 테이블에서 admin_role 검증.
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
    .select("admin_role, is_deleted")
    .eq("id", user.id)
    .single();

  if (error || !me?.admin_role || me.is_deleted) {
    throw new Error("관리자 권한이 없습니다");
  }

  if (minRole === "SUPER_ADMIN" && me.admin_role !== "SUPER_ADMIN") {
    throw new Error("최고 관리자 권한이 필요합니다");
  }

  return { id: user.id, role: me.admin_role as AdminRole };
}


import "server-only";
import { cache } from "react";
import type { AdminRole } from "@/src/shared/types/db";
import { createServerSupabase } from "@/src/shared/api/supabase-server";
import { AuthError } from "@/src/shared/lib/auth-error";

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
 * 세션 → users 테이블에서 admin_role 검증. 관리자 아니면 던진다.
 *
 * 세션 유저(auth uuid)는 users.auth_user_id 로 조회한다 (users.id 는 bigint).
 *
 * ⚠️ 이 함수는 **네트워크 왕복 2회**다 — Auth 서버 검증(getUser) + users 조회.
 * 그래서 요청 단위로 메모이즈한다(`cache`). 한 요청 안에서 여러 조회를 하는
 * Server Component 가 조회마다 이걸 부르면 그 2회가 그대로 곱해진다.
 *
 * `cache` 의 범위는 **한 요청**이다. 서버 액션은 호출마다 별개 요청이므로
 * 액션을 N개 부르면 여전히 N번 검증한다 — 그 비용을 줄이는 방법은 이 함수가
 * 아니라 **조회를 서버 컴포넌트로 모으는 것**이다.
 */
export const requireAdmin = cache(async function requireAdmin(
  minRole: AdminRole = "MANAGER"
): Promise<CurrentAdmin> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AuthError("AUTH_REQUIRED", "로그인이 필요합니다");
  }

  const { data: me, error } = await supabase
    .from("users")
    .select("id, admin_role, deleted_at")
    .eq("auth_user_id", user.id)
    .single();

  if (error || !me?.admin_role || me.deleted_at) {
    throw new AuthError("NOT_ADMIN", "관리자 권한이 없습니다");
  }

  if (minRole === "SUPER_ADMIN" && me.admin_role !== "SUPER_ADMIN") {
    throw new AuthError("NOT_SUPER_ADMIN", "최고 관리자 권한이 필요합니다");
  }

  return {
    id: me.id as number,
    authUserId: user.id,
    role: me.admin_role as AdminRole,
  };
});

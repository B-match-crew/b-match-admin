import type { AdminRole } from "@/src/shared/types/db";

export function isSuperAdmin(role: AdminRole | null | undefined): boolean {
  return role === "SUPER_ADMIN";
}

/**
 * 클라이언트 사이드: 네비 접근 가능 여부.
 */
export function canAccessRoute(
  role: AdminRole | null,
  requiredRoles?: AdminRole[]
): boolean {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  if (!role) return false;
  return requiredRoles.includes(role);
}

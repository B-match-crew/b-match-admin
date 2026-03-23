import type { AdminRole, RolePermissions } from "@/src/entities/admin/types";
import { ROLE_PERMISSIONS } from "@/src/entities/admin/types";

/**
 * 특정 역할이 주어진 리소스에 대해 읽기/쓰기 권한이 있는지 확인
 */
export function hasPermission(
  role: AdminRole | null,
  resource: keyof RolePermissions,
  action: "read" | "write" | "forceCancel"
): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  const resourcePerms = permissions[resource] as Record<string, boolean>;
  return resourcePerms?.[action] ?? false;
}

/**
 * SUPER_ADMIN 여부 확인
 */
export function isSuperAdmin(role: AdminRole | null): boolean {
  return role === "SUPER_ADMIN";
}

/**
 * 재무 쓰기 권한 확인 (정산 승인/실패 처리 등)
 */
export function canWriteFinance(role: AdminRole | null): boolean {
  return hasPermission(role, "finance", "write");
}

/**
 * 모임 직권 취소 권한 확인
 */
export function canForceCancelMatch(role: AdminRole | null): boolean {
  return hasPermission(role, "matches", "forceCancel");
}

/**
 * 네비게이션 항목 표시 여부 결정 (href 기반)
 */
export function canAccessRoute(role: AdminRole | null, href: string): boolean {
  if (!role) return false;
  if (role === "SUPER_ADMIN") return true;

  // MANAGER 접근 불가 경로
  const restrictedRoutes = ["/settings"];
  return !restrictedRoutes.some((route) => href.startsWith(route));
}

"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { requireAdmin } from "@/src/shared/lib/role-guard";
import { rpcSuspendUser, rpcBanUser } from "@/src/shared/api/rpc";
import { REASON_MIN_LENGTH } from "@/src/shared/config/constants";
import type { DbUser } from "@/src/shared/types/db";

export interface UserSearchParams {
  term?: string;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}

export interface UserSearchResult {
  rows: UserListItem[];
  total: number;
}

export type UserListItem = Pick<
  DbUser,
  | "id"
  | "name"
  | "nickname"
  | "phone_number"
  | "user_status"
  | "is_host"
  | "admin_role"
  | "is_deleted"
  | "suspended_until"
  | "suspended_reason"
  | "created_at"
>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHONE_RE = /^[0-9-]+$/;

export async function searchUsers(
  params: UserSearchParams
): Promise<UserSearchResult> {
  await requireAdmin();
  const supabase = createAdminClient();
  const term = params.term?.trim() ?? "";
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  let q = supabase
    .from("users")
    .select(
      "id, name, nickname, phone_number, user_status, is_host, admin_role, is_deleted, suspended_until, suspended_reason, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!params.includeDeleted) {
    q = q.eq("is_deleted", false);
  }

  if (term.length > 0) {
    if (UUID_RE.test(term)) {
      q = q.eq("id", term);
    } else if (PHONE_RE.test(term)) {
      q = q.ilike("phone_number", `%${term}%`);
    } else {
      q = q.or(`name.ilike.%${term}%,nickname.ilike.%${term}%`);
    }
  }

  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: (data ?? []) as UserListItem[], total: count ?? 0 };
}

export async function getUserReportCount(userId: string): Promise<number> {
  await requireAdmin();
  const supabase = createAdminClient();
  // 신고당한 횟수 = 작성한 게시글/댓글에 대한 신고 카운트
  const { data: posts } = await supabase
    .from("posts")
    .select("id")
    .eq("author_id", userId);
  const { data: comments } = await supabase
    .from("comments")
    .select("id")
    .eq("author_id", userId);

  const postIds = (posts ?? []).map((p) => p.id);
  const commentIds = (comments ?? []).map((c) => c.id);

  let total = 0;
  if (postIds.length > 0) {
    const { count } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("target_type", "POST")
      .in("target_id", postIds);
    total += count ?? 0;
  }
  if (commentIds.length > 0) {
    const { count } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("target_type", "COMMENT")
      .in("target_id", commentIds);
    total += count ?? 0;
  }
  return total;
}

// ─── 상세 조회 ───

export interface UserDetail {
  user: DbUser;
  reportCount: number;
  auditHistory: Array<{
    action_type: string;
    reason: string | null;
    created_at: string;
  }>;
}

export async function fetchUserDetail(userId: string): Promise<UserDetail> {
  await requireAdmin();
  const supabase = createAdminClient();

  const [userRes, reportCount, auditRes] = await Promise.all([
    supabase.from("users").select("*").eq("id", userId).single(),
    getUserReportCount(userId),
    supabase
      .from("admin_audit_logs")
      .select("action_type, reason, created_at")
      .eq("target_type", "USER")
      .eq("target_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (userRes.error) throw userRes.error;

  return {
    user: userRes.data as DbUser,
    reportCount,
    auditHistory: (auditRes.data ?? []) as UserDetail["auditHistory"],
  };
}

// ─── 액션 ───

export async function suspendUserAction(p: {
  userId: string;
  until: string;
  reason: string;
}) {
  if (p.reason.trim().length < REASON_MIN_LENGTH) {
    throw new Error(`사유는 ${REASON_MIN_LENGTH}자 이상 입력해야 합니다`);
  }
  await requireAdmin("MANAGER");
  await rpcSuspendUser({ userId: p.userId, until: p.until, reason: p.reason });
  revalidatePath("/users");
}

export async function banUserAction(p: { userId: string; reason: string }) {
  if (p.reason.trim().length < REASON_MIN_LENGTH) {
    throw new Error(`사유는 ${REASON_MIN_LENGTH}자 이상 입력해야 합니다`);
  }
  await requireAdmin("SUPER_ADMIN");
  await rpcBanUser({ userId: p.userId, reason: p.reason });
  revalidatePath("/users");
}

/**
 * 정지 해제: suspended_until 을 NULL 로, user_status 를 ACTIVE 로.
 * RPC 가 spec 에 없으므로 직접 UPDATE.
 */
export async function unsuspendUserAction(userId: string) {
  const admin = await requireAdmin("MANAGER");
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("users")
    .update({
      user_status: "ACTIVE",
      suspended_until: null,
      suspended_reason: null,
    })
    .eq("id", userId)
    .eq("user_status", "SUSPENDED");
  if (error) throw error;

  await supabase.from("admin_audit_logs").insert({
    admin_id: admin.id,
    action_type: "SUSPEND_USER",
    target_type: "USER",
    target_id: userId,
    reason: "정지 해제",
    detail: { unsuspended: true },
  });

  revalidatePath("/users");
}

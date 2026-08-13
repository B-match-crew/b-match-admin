"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { runAction, type ActionResult } from "@/src/shared/lib/action-result";
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
  | "suspended_until"
  | "suspended_reason"
  | "created_at"
  | "deleted_at"
>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMERIC_RE = /^\d+$/;
const PHONE_RE = /^[0-9-]+$/;

export async function searchUsers(
  params: UserSearchParams
): Promise<ActionResult<UserSearchResult>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();
    const term = params.term?.trim() ?? "";
    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    let q = supabase
      .from("users")
      .select(
        "id, name, nickname, phone_number, user_status, is_host, admin_role, suspended_until, suspended_reason, created_at, deleted_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (!params.includeDeleted) {
      q = q.is("deleted_at", null);
    }

    if (term.length > 0) {
      if (UUID_RE.test(term)) {
        // auth uuid 로 검색 (users.auth_user_id)
        q = q.eq("auth_user_id", term);
      } else if (NUMERIC_RE.test(term)) {
        // 숫자 = users.id (bigint) 또는 전화번호 일부 — id 우선
        q = q.eq("id", Number(term));
      } else if (PHONE_RE.test(term)) {
        q = q.ilike("phone_number", `%${term}%`);
      } else {
        q = q.or(`name.ilike.%${term}%,nickname.ilike.%${term}%`);
      }
    }

    const { data, error, count } = await q;
    if (error) throw error;
    return { rows: (data ?? []) as UserListItem[], total: count ?? 0 };
  });
}

// ─── 상세 조회 ───

export interface UserDetail {
  user: DbUser;
  /**
   * 이 유저가 개설한 모임(host_profiles). 유저당 최대 1개
   * (uk_host_profiles_user). 없으면 null — is_host 여도 개설 전이면 없을 수 있다.
   */
  club: {
    id: number;
    club_name: string;
    deleted_at: string | null;
  } | null;
  auditHistory: Array<{
    action_type: string;
    reason: string | null;
    created_at: string;
  }>;
}

export async function fetchUserDetail(
  userId: number
): Promise<ActionResult<UserDetail>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();

    const [userRes, clubRes, auditRes] = await Promise.all([
      supabase.from("users").select("*").eq("id", userId).single(),
      // 삭제된 모임도 가져와 화면에서 상태로 구분한다 (deleted_at 필터 안 함)
      supabase
        .from("host_profiles")
        .select("id, club_name, deleted_at")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("admin_audit_logs")
        .select("action_type, reason, created_at")
        .eq("target_type", "USER")
        .eq("target_id", String(userId)) // target_id 는 text
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (userRes.error) throw userRes.error;
    if (clubRes.error) throw clubRes.error;
    // 조치 이력이 실패하면 "이력 없음"과 구분되지 않는다 — 드러낸다.
    if (auditRes.error) throw auditRes.error;

    return {
      user: userRes.data as DbUser,
      club: (clubRes.data as UserDetail["club"]) ?? null,
      auditHistory: (auditRes.data ?? []) as UserDetail["auditHistory"],
    };
  });
}

// ─── 액션 ───

export async function suspendUserAction(p: {
  userId: number;
  until: string;
  reason: string;
}): Promise<ActionResult<void>> {
  return runAction(async () => {
    if (p.reason.trim().length < REASON_MIN_LENGTH) {
      throw new Error(`사유는 ${REASON_MIN_LENGTH}자 이상 입력해야 합니다`);
    }
    await requireAdmin("MANAGER");
    await rpcSuspendUser({
      userId: p.userId,
      until: p.until,
      reason: p.reason,
    });
    revalidatePath("/users");
  });
}

export async function banUserAction(p: {
  userId: number;
  reason: string;
}): Promise<ActionResult<void>> {
  return runAction(async () => {
    if (p.reason.trim().length < REASON_MIN_LENGTH) {
      throw new Error(`사유는 ${REASON_MIN_LENGTH}자 이상 입력해야 합니다`);
    }
    await requireAdmin("SUPER_ADMIN");
    await rpcBanUser({ userId: p.userId, reason: p.reason });
    revalidatePath("/users");
  });
}

/**
 * 정지 해제: suspended_until 을 NULL 로, user_status 를 ACTIVE 로.
 * RPC 가 spec 에 없으므로 직접 UPDATE.
 */
export async function unsuspendUserAction(
  userId: number
): Promise<ActionResult<void>> {
  return runAction(async () => {
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
      admin_id: admin.id, // number (bigint FK)
      action_type: "UNSUSPEND", // 라이브 RPC 없음 — 관리자 페이지 전용 값
      target_type: "USER",
      target_id: String(userId), // text
      reason: "정지 해제",
      detail: { unsuspended: true },
    });

    revalidatePath("/users");
  });
}

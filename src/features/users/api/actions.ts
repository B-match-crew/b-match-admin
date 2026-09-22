"use server";

import type {
  UserSearchParams,
  UserSearchResult,
  UserListItem,
  UserDetail,
} from "../model/actions";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { runAction, type ActionResult } from "@/src/shared/lib/action-result";
import { requireAdmin } from "@/src/shared/lib/role-guard";
import { rpcSuspendUser, rpcBanUser } from "@/src/shared/api/rpc";
import { REASON_MIN_LENGTH } from "@/src/shared/config/constants";
import type { DbUser } from "@/src/shared/types/db";
import { classifyUserSearchTerm, quoteOrValue } from "../model/search-term";


export async function searchUsers(
  params: UserSearchParams
): Promise<ActionResult<UserSearchResult>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();
    const term = classifyUserSearchTerm(params.term);
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

    // 검색어 분류 규칙은 model/search-term.ts (전화번호는 숫자만 저장된다).
    switch (term.kind) {
      case "none":
        break;
      case "authUserId":
        q = q.eq("auth_user_id", term.value);
        break;
      case "phone":
        q = q.ilike("phone_number", `%${term.digits}%`);
        break;
      case "idOrPhone":
        q = q.or(`id.eq.${term.id},phone_number.ilike.%${term.digits}%`);
        break;
      case "text": {
        const v = quoteOrValue(`%${term.value}%`);
        q = q.or(`name.ilike.${v},nickname.ilike.${v}`);
        break;
      }
    }

    const { data, error, count } = await q;
    if (error) throw error;
    return { rows: (data ?? []) as UserListItem[], total: count ?? 0 };
  });
}

// ─── 상세 조회 ───

export async function fetchUserDetail(
  userId: number
): Promise<ActionResult<UserDetail>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();

    const [userRes, clubRes, auditRes, blockedRes, reportedRes, chatRes] =
      await Promise.all([
      supabase.from("users").select("*").eq("id", userId).single(),
      // 삭제된 모임도 가져와 화면에서 상태로 구분한다 (deleted_at 필터 안 함).
      // 유니크는 살아있는 행에만 걸려 있어(app migration 18) 삭제→재등록한
      // 유저는 행이 여러 개다 — 살아있는 모임 우선, 없으면 가장 최근 것 하나.
      supabase
        .from("host_profiles")
        .select("id, club_name, deleted_at")
        .eq("user_id", userId)
        .order("deleted_at", { ascending: true, nullsFirst: true })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("admin_audit_logs")
        .select("action_type, reason, created_at")
        .eq("target_type", "USER")
        .eq("target_id", String(userId)) // target_id 는 text
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("user_blocks")
        .select("id", { count: "exact", head: true })
        .eq("blocked_id", userId),
      supabase
        .from("match_reports")
        .select("id", { count: "exact", head: true })
        .eq("host_id", userId),
      supabase
        .from("chat_room_members")
        .select("room_id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("left_at", null),
    ]);

    if (userRes.error) throw userRes.error;
    if (clubRes.error) throw clubRes.error;
    // 조치 이력이 실패하면 "이력 없음"과 구분되지 않는다 — 드러낸다.
    if (auditRes.error) throw auditRes.error;
    if (blockedRes.error) throw blockedRes.error;
    if (reportedRes.error) throw reportedRes.error;

    return {
      user: userRes.data as DbUser,
      club: (clubRes.data as UserDetail["club"]) ?? null,
      auditHistory: (auditRes.data ?? []) as UserDetail["auditHistory"],
      blockedCount: blockedRes.count ?? 0,
      reportedCount: reportedRes.count ?? 0,
      // 채팅 테이블이 없는 DB 에서는 에러가 온다. 그 하나 때문에 상세 전체를
      // 못 열게 하지 않는다 — 모르는 값은 null 로 두고 화면에서 감춘다.
      chatRoomCount: chatRes.error ? null : (chatRes.count ?? 0),
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

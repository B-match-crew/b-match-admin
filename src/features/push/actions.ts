"use server";

import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { createServerSupabase } from "@/src/shared/api/supabase-server";
import { requireAdmin } from "@/src/shared/lib/role-guard";
import { callSendPush, type PushTarget } from "@/src/shared/api/edge";

export interface SendPushInput {
  target: PushTarget;
  user_ids?: string[];
  title: string;
  body: string;
  deeplink_route?: string;
}

export async function sendPushAction(input: SendPushInput) {
  await requireAdmin("MANAGER");

  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("세션이 만료되었습니다");

  return callSendPush(session.access_token, {
    target: input.target,
    user_ids: input.user_ids ?? [],
    type: "ADMIN_NOTICE",
    title: input.title,
    body: input.body,
    deeplink_route: input.deeplink_route ?? "/",
    deeplink_params: {},
  });
}

/**
 * 테스트 발송: 본인 user_id 만 타겟.
 */
export async function sendTestPushAction(input: {
  title: string;
  body: string;
}) {
  const admin = await requireAdmin("MANAGER");

  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("세션이 만료되었습니다");

  return callSendPush(session.access_token, {
    target: "USERS",
    user_ids: [admin.id],
    type: "ADMIN_NOTICE",
    title: `[테스트] ${input.title}`,
    body: input.body,
    deeplink_route: "/",
    deeplink_params: {},
  });
}

// ─── 발송 이력 ───

export interface PushHistoryRow {
  id: number;
  title: string;
  body: string;
  created_at: string;
}

export async function fetchPushHistory(limit = 50): Promise<PushHistoryRow[]> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, body, created_at")
    .eq("type", "ADMIN_NOTICE")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as PushHistoryRow[];
}

// ─── 예상 발송 수 ───

export async function fetchEstimatedRecipients(
  target: PushTarget,
  userIds?: string[]
): Promise<number> {
  await requireAdmin();
  const supabase = createAdminClient();

  if (target === "USERS") {
    return userIds?.length ?? 0;
  }

  let q = supabase
    .from("fcm_tokens")
    .select("user_id", { count: "exact", head: true });

  if (target === "HOSTS") {
    // fcm_tokens 테이블에서 호스트인 유저 토큰만 카운트
    const { data: hosts } = await supabase
      .from("users")
      .select("id")
      .eq("is_host", true)
      .eq("is_deleted", false);
    const hostIds = (hosts ?? []).map((h) => h.id);
    if (hostIds.length === 0) return 0;
    q = q.in("user_id", hostIds);
  } else if (target === "GUESTS") {
    const { data: guests } = await supabase
      .from("users")
      .select("id")
      .eq("is_host", false)
      .eq("is_deleted", false);
    const guestIds = (guests ?? []).map((g) => g.id);
    if (guestIds.length === 0) return 0;
    q = q.in("user_id", guestIds);
  }

  const { count } = await q;
  return count ?? 0;
}

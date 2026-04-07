"use server";

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

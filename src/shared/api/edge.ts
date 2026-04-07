/**
 * admin_db_spec.md §5 Edge Function 호출
 */

import type { NotificationType } from "@/src/shared/types/db";

export type PushTarget = "ALL" | "HOSTS" | "GUESTS" | "USERS";

export interface SendPushPayload {
  target: PushTarget;
  user_ids?: string[];
  type: NotificationType;
  title: string;
  body: string;
  deeplink_route?: string;
  deeplink_params?: Record<string, unknown>;
}

export interface SendPushResponse {
  sent: number;
  db: number;
  target: PushTarget;
}

/**
 * /functions/v1/send-push 호출.
 * Server Action 내부에서 호출하며, accessToken 은 createServerSupabase() 의
 * session.access_token 을 사용한다.
 */
export async function callSendPush(
  accessToken: string,
  payload: SendPushPayload
): Promise<SendPushResponse> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`푸시 발송 실패 (${res.status}): ${text}`);
  }

  return (await res.json()) as SendPushResponse;
}

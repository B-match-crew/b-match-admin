import type { SupabaseClient } from "@supabase/supabase-js";
import type { PushNotification } from "@/src/entities/notification/types";

export interface SendPushPayload {
  title: string;
  body: string;
  target: "all" | "hosts" | "custom";
  targetIds?: string[];
  scheduledAt?: string | null;
}

export interface PushHistoryResult {
  data: PushNotification[];
  total: number;
}

export async function fetchPushHistory(
  supabase: SupabaseClient,
  page: number,
  limit: number
): Promise<PushHistoryResult> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await supabase
    .from("push_notifications")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    data: (data ?? []) as PushNotification[],
    total: count ?? 0,
  };
}

export async function sendPushNotification(
  supabase: SupabaseClient,
  payload: SendPushPayload
): Promise<PushNotification> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("push_notifications")
    .insert({
      title: payload.title,
      body: payload.body,
      target: payload.target,
      target_ids: payload.targetIds ?? null,
      scheduled_at: payload.scheduledAt ?? null,
      status: payload.scheduledAt ? "PENDING" : "SENT",
      sent_at: payload.scheduledAt ? null : new Date().toISOString(),
      sent_by: user?.id ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  return data as PushNotification;
}

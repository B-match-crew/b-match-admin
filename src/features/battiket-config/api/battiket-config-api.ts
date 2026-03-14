import type { SupabaseClient } from "@supabase/supabase-js";
import type { BattiketConfig } from "@/src/entities/battiket/types";

export async function fetchBattiketConfig(
  supabase: SupabaseClient
): Promise<BattiketConfig | null> {
  const { data, error } = await supabase
    .from("battiket_config")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data as BattiketConfig;
}

export async function updateBattiketConfig(
  supabase: SupabaseClient,
  config: Partial<BattiketConfig> & { id: string }
): Promise<BattiketConfig> {
  const { data, error } = await supabase
    .from("battiket_config")
    .update({
      guest_to_host_best: config.guest_to_host_best,
      guest_to_host_normal: config.guest_to_host_normal,
      guest_to_host_bad: config.guest_to_host_bad,
      host_to_guest_best: config.host_to_guest_best,
      host_to_guest_normal: config.host_to_guest_normal,
      host_to_guest_bad: config.host_to_guest_bad,
      no_payment_penalty: config.no_payment_penalty,
      no_show_penalty: config.no_show_penalty,
      host_cancel_penalty: config.host_cancel_penalty,
      host_abandon_penalty: config.host_abandon_penalty,
      updated_at: new Date().toISOString(),
    })
    .eq("id", config.id)
    .select()
    .single();

  if (error) throw error;

  return data as BattiketConfig;
}

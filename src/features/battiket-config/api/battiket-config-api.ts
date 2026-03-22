import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppConfig } from "@/src/entities/config/types";

// v3.0: 배티켓 관련 설정은 app_config 테이블의 key-value로 저장
export type BattiketConfigMap = Record<string, string>;

export async function fetchBattiketConfig(
  supabase: SupabaseClient
): Promise<BattiketConfigMap> {
  const { data, error } = await supabase
    .from("app_config")
    .select("*")
    .like("key", "batticket.%");

  if (error) throw error;

  const configMap: BattiketConfigMap = {};
  for (const item of (data ?? []) as AppConfig[]) {
    configMap[item.key] = item.value;
  }
  return configMap;
}

export async function updateBattiketConfig(
  supabase: SupabaseClient,
  key: string,
  value: string
): Promise<void> {
  const { error } = await supabase
    .from("app_config")
    .update({ value, updated_at: new Date().toISOString() })
    .eq("key", key);

  if (error) throw error;
}

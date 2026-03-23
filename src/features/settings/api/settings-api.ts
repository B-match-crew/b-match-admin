import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppConfig } from "@/src/entities/config/types";

export async function fetchAppConfigs(
  supabase: SupabaseClient
): Promise<AppConfig[]> {
  const { data, error } = await supabase
    .from("app_config")
    .select("*")
    .order("key", { ascending: true });

  if (error) {
    throw new Error(`설정 조회 실패: ${error.message}`);
  }

  return (data as AppConfig[]) ?? [];
}

export async function updateAppConfig(
  supabase: SupabaseClient,
  key: string,
  value: string
): Promise<void> {
  const { error } = await supabase
    .from("app_config")
    .update({
      value,
      updated_at: new Date().toISOString(),
    })
    .eq("key", key);

  if (error) {
    throw new Error(`설정 변경 실패: ${error.message}`);
  }
}

export interface SystemStatus {
  totalUsers: number;
  activeMatches: number;
  pendingReports: number;
  pendingSettlements: number;
}

export async function fetchSystemStatus(
  supabase: SupabaseClient
): Promise<SystemStatus> {
  const [usersResult, matchesResult, reportsResult, settlementsResult] =
    await Promise.all([
      supabase
        .from("users")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .in("status", ["RECRUITING", "CLOSED", "IN_PROGRESS"]),
      supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "PENDING"),
      supabase
        .from("settlement_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ["PENDING", "EXPORTED"]),
    ]);

  return {
    totalUsers: usersResult.count ?? 0,
    activeMatches: matchesResult.count ?? 0,
    pendingReports: reportsResult.count ?? 0,
    pendingSettlements: settlementsResult.count ?? 0,
  };
}

export const CONFIG_LABELS: Record<string, { label: string; type: "text" | "number" }> = {
  min_app_version_ios: { label: "iOS 최소 버전", type: "text" },
  min_app_version_android: { label: "Android 최소 버전", type: "text" },
  bank_maintenance_start: { label: "은행 점검 시작 시간", type: "text" },
  bank_maintenance_end: { label: "은행 점검 종료 시간", type: "text" },
  escrow_lock_hours: { label: "에스크로 보류 시간 (h)", type: "number" },
  badticket_base_score: { label: "배티켓 기본 점수", type: "number" },
};

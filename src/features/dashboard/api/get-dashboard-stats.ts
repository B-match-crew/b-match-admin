import type { SupabaseClient } from "@supabase/supabase-js";

export interface DashboardStats {
  totalUsers: number;
  todayNewUsers: number;
  activeMatchings: number;
  pendingReports: number;
}

export async function getDashboardStats(
  supabase: SupabaseClient
): Promise<DashboardStats> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [totalUsers, todayNewUsers, activeMatchings, pendingReports] =
    await Promise.all([
      supabase
        .from("users")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayStart.toISOString()),
      supabase
        .from("matchings")
        .select("id", { count: "exact", head: true })
        .eq("recruitment_status", "모집중"),
      supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "처리 대기"),
    ]);

  return {
    totalUsers: totalUsers.count ?? 0,
    todayNewUsers: todayNewUsers.count ?? 0,
    activeMatchings: activeMatchings.count ?? 0,
    pendingReports: pendingReports.count ?? 0,
  };
}

import type { SupabaseClient } from "@supabase/supabase-js";

export interface DashboardStats {
  totalUsers: number;
  todayNewUsers: number;
  activeMatches: number;
  pendingReports: number;
}

export async function getDashboardStats(
  supabase: SupabaseClient
): Promise<DashboardStats> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [totalUsers, todayNewUsers, activeMatches, pendingReports] =
    await Promise.all([
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("status", "ACTIVE"),
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayStart.toISOString()),
      supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("status", "RECRUITING"),
      supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "PENDING"),
    ]);

  return {
    totalUsers: totalUsers.count ?? 0,
    todayNewUsers: todayNewUsers.count ?? 0,
    activeMatches: activeMatches.count ?? 0,
    pendingReports: pendingReports.count ?? 0,
  };
}

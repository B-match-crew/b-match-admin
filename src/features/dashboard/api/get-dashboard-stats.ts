import type { SupabaseClient } from "@supabase/supabase-js";

export interface DashboardStats {
  totalUsers: number;
  todayNewUsers: number;
  activeMatches: number;
  pendingReports: number;
  todayScheduledMatches: number;
  failedRefunds: number;
}

export async function getDashboardStats(
  supabase: SupabaseClient
): Promise<DashboardStats> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [
    totalUsers,
    todayNewUsers,
    activeMatches,
    pendingReports,
    todayScheduledMatches,
    failedRefunds,
  ] = await Promise.all([
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
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .gte("start_time", todayStart.toISOString())
      .lte("start_time", todayEnd.toISOString())
      .in("status", ["RECRUITING", "CLOSED", "IN_PROGRESS"]),
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "REFUND_FAILED"),
  ]);

  return {
    totalUsers: totalUsers.count ?? 0,
    todayNewUsers: todayNewUsers.count ?? 0,
    activeMatches: activeMatches.count ?? 0,
    pendingReports: pendingReports.count ?? 0,
    todayScheduledMatches: todayScheduledMatches.count ?? 0,
    failedRefunds: failedRefunds.count ?? 0,
  };
}

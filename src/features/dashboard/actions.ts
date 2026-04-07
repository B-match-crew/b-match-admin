"use server";

import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { requireAdmin } from "@/src/shared/lib/role-guard";

export interface DashboardStats {
  todayDau: number;
  pendingReports: number;
  todayMatches: number;
  recruitingMatches: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  await requireAdmin();
  const supabase = createAdminClient();

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const [dauRes, pendingReportsRes, todayMatchesRes, recruitingRes] =
    await Promise.all([
      supabase
        .from("fcm_tokens")
        .select("user_id", { count: "exact", head: true })
        .gte("updated_at", start.toISOString()),
      supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "PENDING"),
      supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("is_deleted", false)
        .gte("start_time", start.toISOString())
        .lte("start_time", end.toISOString()),
      supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("is_deleted", false)
        .eq("status", "RECRUITING"),
    ]);

  return {
    todayDau: dauRes.count ?? 0,
    pendingReports: pendingReportsRes.count ?? 0,
    todayMatches: todayMatchesRes.count ?? 0,
    recruitingMatches: recruitingRes.count ?? 0,
  };
}

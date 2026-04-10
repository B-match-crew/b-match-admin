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

// ─── 시계열 데이터 (최근 14일) ───

export interface DailyTrendItem {
  date: string; // yyyy-MM-dd
  reports: number;
  matches: number;
}

export async function fetchDailyTrends(
  days = 14
): Promise<DailyTrendItem[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  const results: DailyTrendItem[] = [];
  const now = new Date();

  // 최근 N일간 일별 신고/매칭 등록 수 집계
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);

    results.push({
      date: dayStart.toISOString().slice(0, 10),
      reports: 0,
      matches: 0,
    });
  }

  // 한번에 범위 조회
  const rangeStart = results[0].date + "T00:00:00.000Z";
  const rangeEnd = results[results.length - 1].date + "T23:59:59.999Z";

  const [reportsRes, matchesRes] = await Promise.all([
    supabase
      .from("reports")
      .select("created_at")
      .gte("created_at", rangeStart)
      .lte("created_at", rangeEnd),
    supabase
      .from("matches")
      .select("created_at")
      .eq("is_deleted", false)
      .gte("created_at", rangeStart)
      .lte("created_at", rangeEnd),
  ]);

  const dateMap = new Map(results.map((r) => [r.date, r]));

  for (const r of reportsRes.data ?? []) {
    const day = r.created_at.slice(0, 10);
    const item = dateMap.get(day);
    if (item) item.reports++;
  }

  for (const m of matchesRes.data ?? []) {
    const day = m.created_at.slice(0, 10);
    const item = dateMap.get(day);
    if (item) item.matches++;
  }

  return results;
}

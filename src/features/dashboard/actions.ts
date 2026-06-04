"use server";

import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { requireAdmin } from "@/src/shared/lib/role-guard";

export interface DashboardStats {
  /** 전체 활성 유저 수 (deleted_at IS NULL) */
  totalUsers: number;
  /** 누적 게스트 디바이스 수 (fn_get_total_guest_count) */
  totalGuests: number;
  /** 오늘 시작 예정 모임 수 */
  todayMatches: number;
  /** 모집 중 모임 수 */
  recruitingMatches: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  await requireAdmin();
  const supabase = createAdminClient();

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const [totalUsersRes, guestCountRes, todayMatchesRes, recruitingRes] =
    await Promise.all([
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null),
      supabase.rpc("fn_get_total_guest_count"),
      supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .gte("start_time", start.toISOString())
        .lte("start_time", end.toISOString()),
      supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .eq("status", "RECRUITING"),
    ]);

  return {
    totalUsers: totalUsersRes.count ?? 0,
    totalGuests: (guestCountRes.data as number | null) ?? 0,
    todayMatches: todayMatchesRes.count ?? 0,
    recruitingMatches: recruitingRes.count ?? 0,
  };
}

// ─── 시계열 데이터 (최근 14일) ───

export interface DailyTrendItem {
  date: string; // yyyy-MM-dd
  matches: number;
}

export async function fetchDailyTrends(
  days = 14
): Promise<DailyTrendItem[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  const results: DailyTrendItem[] = [];
  const now = new Date();

  // 최근 N일간 일별 매칭 등록 수 집계
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);

    results.push({
      date: dayStart.toISOString().slice(0, 10),
      matches: 0,
    });
  }

  // 한번에 범위 조회
  const rangeStart = results[0].date + "T00:00:00.000Z";
  const rangeEnd = results[results.length - 1].date + "T23:59:59.999Z";

  const { data: matchesData } = await supabase
    .from("matches")
    .select("created_at")
    .is("deleted_at", null)
    .gte("created_at", rangeStart)
    .lte("created_at", rangeEnd);

  const dateMap = new Map(results.map((r) => [r.date, r]));

  for (const m of matchesData ?? []) {
    const day = m.created_at.slice(0, 10);
    const item = dateMap.get(day);
    if (item) item.matches++;
  }

  return results;
}

"use server";

import type {
  DashboardStats,
  DailyTrendItem,
} from "../model/actions";

import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { runAction, type ActionResult } from "@/src/shared/lib/action-result";
import { requireAdmin } from "@/src/shared/lib/role-guard";

export async function fetchDashboardStats(): Promise<
  ActionResult<DashboardStats>
> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    // 게스트 수: fn_get_total_guest_count 는 anon/authenticated 에게만 grant 되어
    // service_role(admin client)로는 실행 불가 → guest_devices 직접 count (RLS 우회).
    const [totalUsersRes, guestCountRes, todayMatchesRes, recruitingRes] =
      await Promise.all([
        supabase
          .from("users")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null),
        supabase.from("guest_devices").select("id", { count: "exact", head: true }),
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

    // count 조회는 에러를 삼키면 0 이 정상 수치처럼 보인다 — 반드시 드러낸다.
    if (totalUsersRes.error) throw totalUsersRes.error;
    if (guestCountRes.error) throw guestCountRes.error;
    if (todayMatchesRes.error) throw todayMatchesRes.error;
    if (recruitingRes.error) throw recruitingRes.error;

    return {
      totalUsers: totalUsersRes.count ?? 0,
      totalGuests: guestCountRes.count ?? 0,
      todayMatches: todayMatchesRes.count ?? 0,
      recruitingMatches: recruitingRes.count ?? 0,
    };
  });
}

// ─── 시계열 데이터 (최근 14일) ───

export async function fetchDailyTrends(
  days = 14
): Promise<ActionResult<DailyTrendItem[]>> {
  return runAction(async () => {
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

    const { data: matchesData, error } = await supabase
      .from("matches")
      .select("created_at")
      .is("deleted_at", null)
      .gte("created_at", rangeStart)
      .lte("created_at", rangeEnd);
    if (error) throw error;

    const dateMap = new Map(results.map((r) => [r.date, r]));

    for (const m of matchesData ?? []) {
      const day = m.created_at.slice(0, 10);
      const item = dateMap.get(day);
      if (item) item.matches++;
    }

    return results;
  });
}

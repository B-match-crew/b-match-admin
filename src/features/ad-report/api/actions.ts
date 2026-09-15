"use server";

import type {
  HomeImpressionDay,
  HomeImpressionReport,
  HomeImpressionSummary,
} from "../model/actions";
import { validateRange, type DateRangeKst } from "../model/period";

import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { runAction, type ActionResult } from "@/src/shared/lib/action-result";
import { requireAdmin } from "@/src/shared/lib/role-guard";

/**
 * 광고 리포트 — 홈 노출 (app migration 117).
 *
 * 일별과 기간 요약을 **따로** 받는다. 기간 순 기기는 일별 기기를 더해서 만들 수
 * 없다 — 같은 기기가 날마다 다시 세어진다. 그래서 서버가 두 번 센다.
 *
 * 기간은 KST 일자 문자열 그대로 넘긴다. 서버(Vercel)는 UTC 라 여기서 Date 로
 * 바꾸면 하루가 밀린다.
 */
export async function fetchHomeImpressionReport(
  range: DateRangeKst
): Promise<ActionResult<HomeImpressionReport>> {
  return runAction(async () => {
    await requireAdmin();
    // 화면이 먼저 막지만 서버 액션은 직접 부를 수 있다 — 여기서 다시 본다.
    const invalid = validateRange(range);
    if (invalid) throw new Error(invalid);

    const supabase = createAdminClient();
    const params = { p_from: range.from, p_to: range.to };
    const [daily, summary] = await Promise.all([
      supabase.rpc("fn_admin_home_impression_daily", params),
      supabase.rpc("fn_admin_home_impression_summary", params),
    ]);
    if (daily.error) throw daily.error;
    if (summary.error) throw summary.error;

    const days = (daily.data ?? []) as {
      day: string;
      impressions: number;
      devices: number;
      members: number;
    }[];
    // 요약은 늘 1행이다(117). 비어 오면 0 으로 둔다 — 없는 값을 지어내지 않는다.
    const s = ((summary.data ?? []) as {
      impressions: number;
      devices: number;
      members: number;
      frequency: number | string | null;
      collected_since: string | null;
    }[])[0];

    const summaryModel: HomeImpressionSummary = {
      impressions: s?.impressions ?? 0,
      devices: s?.devices ?? 0,
      members: s?.members ?? 0,
      frequency: s?.frequency == null ? null : Number(s.frequency),
      collectedSince: s?.collected_since ?? null,
    };

    return {
      range: { from: range.from, to: range.to },
      summary: summaryModel,
      daily: days.map(
        (d): HomeImpressionDay => ({
          date: d.day,
          impressions: d.impressions,
          devices: d.devices,
          members: d.members,
        })
      ),
    };
  });
}

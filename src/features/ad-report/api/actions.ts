"use server";

import type {
  ImpressionDay,
  ImpressionReport,
  ImpressionSummary,
} from "../model/actions";
import { validateRange, type DateRangeKst } from "../model/period";
import { PLACEMENTS } from "../model/placements";

import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { runAction, type ActionResult } from "@/src/shared/lib/action-result";
import { requireAdmin } from "@/src/shared/lib/role-guard";

type DailyRow = {
  placement: string;
  day: string;
  impressions: number;
  devices: number;
  members: number;
  // 클릭이 없는 지면(지도)은 서버가 null 을 준다 — 0 으로 바꾸지 않는다(121).
  clicks: number | null;
  click_devices: number | null;
};

type SummaryRow = {
  placement: string;
  impressions: number;
  devices: number;
  members: number;
  frequency: number | string | null;
  collected_since: string | null;
  clicks: number | null;
  click_devices: number | null;
  ctr: number | string | null;
  clicks_collected_since: string | null;
};

/**
 * 광고 리포트 — 지면별 노출·클릭 (app migration 118, 클릭은 121).
 *
 * 일별과 기간 요약을 **따로** 받는다. 기간 순 기기는 일별 기기를 더해서 만들 수
 * 없다 — 같은 기기가 날마다 다시 세어진다. 서버가 지면을 한 번에 돌려주므로 지면이
 * 늘어도 왕복은 두 번이다.
 *
 * 기간은 KST 일자 문자열 그대로 넘긴다. 서버(Vercel)는 UTC 라 여기서 Date 로
 * 바꾸면 하루가 밀린다.
 */
export async function fetchImpressionReport(
  range: DateRangeKst
): Promise<ActionResult<ImpressionReport>> {
  return runAction(async () => {
    await requireAdmin();
    // 화면이 먼저 막지만 서버 액션은 직접 부를 수 있다 — 여기서 다시 본다.
    const invalid = validateRange(range);
    if (invalid) throw new Error(invalid);

    const supabase = createAdminClient();
    const params = { p_from: range.from, p_to: range.to };
    const [daily, summary] = await Promise.all([
      supabase.rpc("fn_admin_impression_daily", params),
      supabase.rpc("fn_admin_impression_summary", params),
    ]);
    if (daily.error) throw daily.error;
    if (summary.error) throw summary.error;

    const dayRows = (daily.data ?? []) as DailyRow[];
    const summaryRows = (summary.data ?? []) as SummaryRow[];

    return {
      range: { from: range.from, to: range.to },
      // 화면의 지면 목록을 기준으로 짠다 — 서버가 한 지면을 빠뜨리면 0 으로 두고,
      // 여기 없는 지면을 보내면 버린다. 없는 값을 지어내지 않는다.
      placements: PLACEMENTS.map(({ value }) => ({
        placement: value,
        summary: toSummary(summaryRows.find((r) => r.placement === value)),
        daily: dayRows
          .filter((r) => r.placement === value)
          .map(
            (r): ImpressionDay => ({
              date: r.day,
              impressions: r.impressions,
              devices: r.devices,
              members: r.members,
              clicks: r.clicks,
              clickDevices: r.click_devices,
            })
          ),
      })),
    };
  });
}

function toSummary(row: SummaryRow | undefined): ImpressionSummary {
  return {
    impressions: row?.impressions ?? 0,
    devices: row?.devices ?? 0,
    members: row?.members ?? 0,
    frequency: row?.frequency == null ? null : Number(row.frequency),
    collectedSince: row?.collected_since ?? null,
    // ?? 를 쓰지 않는다 — 서버의 null 은 "이 지면엔 클릭이 없다" 라는 값이고,
    // 0 으로 접으면 "아무도 안 눌렀다" 가 되어 뜻이 바뀐다(121).
    clicks: row?.clicks ?? null,
    clickDevices: row?.click_devices ?? null,
    ctr: row?.ctr == null ? null : Number(row.ctr),
    clicksCollectedSince: row?.clicks_collected_since ?? null,
  };
}

"use server";

import type {
  DeletionReasonSummaryRow,
  DeletionReasonDetail,
} from "../model/actions";

import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { runAction, type ActionResult } from "@/src/shared/lib/action-result";
import { requireAdmin } from "@/src/shared/lib/role-guard";

/**
 * 탈퇴 사유 (app migration 99).
 *
 * 🔴 이 데이터에는 **누가 썼는지가 없다.** user_id 도, 닉네임도, 어떤 식별자도
 *    저장하지 않는다. 탈퇴한 사람의 말이고, migration 56 이 30일 뒤 users 행을
 *    물리 삭제하는데 사유는 그 뒤에도 남아야 통계가 되기 때문이다.
 *    남는 것은 셋뿐이다 — 사유 코드들, 자유입력, **탈퇴 시점에 호스트였는가**.
 *
 * ⚠️ 그래서 이 화면에서 특정 사용자를 찾아갈 수는 없다. 그것이 설계다.
 */

// ─── 1. 집계 ───

/**
 * 사유 코드 × 호스트 여부. 한 사람이 사유를 여러 개 골랐으면 **각각 센다**
 * (멀티셀렉트라 합계가 탈퇴자 수보다 클 수 있다).
 *
 * [from]/[to] 는 KST 일자(yyyy-MM-dd). 서버는 timestamptz 로 받으므로 KST
 * 오프셋을 붙여 보낸다 — 안 붙이면 UTC 자정으로 읽혀 하루가 9시간 밀린다.
 */
export async function fetchDeletionReasonSummary(range?: {
  from: string;
  to: string;
}): Promise<ActionResult<DeletionReasonSummaryRow[]>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc(
      "fn_admin_deletion_reason_summary",
      range
        ? {
            p_from: `${range.from}T00:00:00+09:00`,
            // to 는 포함 경계(KST 그날)라 다음 날 0시 전까지를 뜻한다.
            p_to: `${range.to}T24:00:00+09:00`,
          }
        : {}
    );
    if (error) throw error;

    return (data ?? []).map(
      (r: { reason_code: string; was_host: boolean; cnt: number }) => ({
        reasonCode: r.reason_code,
        wasHost: r.was_host,
        cnt: r.cnt,
      })
    );
  });
}

// ─── 2. 상세 (자유입력) ───

/** 최신순. 서버가 limit 을 1~200 으로 자른다. */
export async function fetchDeletionReasonDetails(p: {
  limit: number;
  offset: number;
}): Promise<ActionResult<DeletionReasonDetail[]>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc(
      "fn_admin_deletion_reason_details",
      { p_limit: p.limit, p_offset: p.offset }
    );
    if (error) throw error;

    return (data ?? []).map(
      (r: {
        id: number;
        created_at: string;
        was_host: boolean;
        reason_codes: string[] | null;
        detail: string | null;
      }) => ({
        id: r.id,
        createdAt: r.created_at,
        wasHost: r.was_host,
        reasonCodes: r.reason_codes,
        detail: r.detail,
      })
    );
  });
}

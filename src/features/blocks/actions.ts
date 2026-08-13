"use server";

import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { runAction, type ActionResult } from "@/src/shared/lib/action-result";
import { requireAdmin } from "@/src/shared/lib/role-guard";

/**
 * 차단 관리.
 *
 *  - 차단 랭킹: user_blocks 를 blocked_id 로 묶어 "여러 명에게 반복 차단당한
 *    유저"를 잡는다. GROUP BY 라 fn_admin_block_ranking RPC(migration 33)로
 *    집계 — JS 집계는 max-rows(1000)에 잘려 문제 유저를 놓친다.
 *  - 영구 차단 목록: permanent_blacklist 단순 조회(집계 없음).
 *
 * 둘 다 조회 전용. 영구 차단 해제는 CI 파기·재가입 정책과 얽혀 여기서 다루지
 * 않는다.
 */

// ─── 차단 랭킹 ───

export interface BlockRankItem {
  blocked_id: number;
  nickname: string | null;
  name: string | null;
  user_status: string;
  /** 차단당한 총 횟수 */
  blockCount: number;
  /** 서로 다른 차단자 수 — 실질 신뢰도 지표 */
  blockerCount: number;
}

export async function fetchBlockRanking(
  limit = 50
): Promise<ActionResult<BlockRankItem[]>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("fn_admin_block_ranking", {
      p_limit: limit,
    });
    if (error) throw error;

    return (data ?? []).map(
      (r: {
        blocked_id: number;
        nickname: string | null;
        name: string | null;
        user_status: string;
        block_count: number;
        blocker_count: number;
      }) => ({
        blocked_id: r.blocked_id,
        nickname: r.nickname,
        name: r.name,
        user_status: r.user_status,
        blockCount: r.block_count,
        blockerCount: r.blocker_count,
      })
    );
  });
}

// ─── 영구 차단 목록 ───

export interface BlacklistItem {
  id: number;
  ci_hash: string;
  reason: string;
  created_at: string;
  user: { id: number; nickname: string | null; name: string | null } | null;
}

export interface BlacklistResult {
  rows: BlacklistItem[];
  total: number;
}

export async function fetchBlacklist(
  limit = 50,
  offset = 0
): Promise<ActionResult<BlacklistResult>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data, error, count } = await supabase
      .from("permanent_blacklist")
      .select(
        `id, ci_hash, reason, created_at,
       user:users!fk_permanent_blacklist_user(id, nickname, name)`,
        { count: "exact" }
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    return {
      rows: (data ?? []) as unknown as BlacklistItem[],
      total: count ?? 0,
    };
  });
}

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
  /**
   * 출처별 내역 (app migration 67).
   *
   * 매칭과 채팅이 같은 `user_blocks` 를 쓴다. 이 랭킹은 원래 "반복 차단당한
   * **모임장**"을 찾는 지표였는데, 채팅 차단이 섞이면서 합계만으로는 그 차이를
   * 알 수 없게 됐다 — 일반 신청자가 채팅에서 차단당해도 같은 목록에 오른다.
   */
  matchBlockCount: number;
  chatBlockCount: number;
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
        match_block_count: number | null;
        chat_block_count: number | null;
      }) => ({
        blocked_id: r.blocked_id,
        nickname: r.nickname,
        name: r.name,
        user_status: r.user_status,
        blockCount: r.block_count,
        blockerCount: r.blocker_count,
        // 67 적용 전 서버가 응답하면 필드가 없다 — 합계를 매칭으로 본다
        // (그 시점엔 채팅 차단이 존재하지 않았으므로 사실과 같다).
        matchBlockCount: r.match_block_count ?? r.block_count,
        chatBlockCount: r.chat_block_count ?? 0,
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

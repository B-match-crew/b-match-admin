"use server";

import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { runAction, type ActionResult } from "@/src/shared/lib/action-result";
import { requireAdmin } from "@/src/shared/lib/role-guard";
import type { PushReach } from "@/src/entities/notification/model/push-reach";

/** 집계는 전부 RPC 안에서 끝난다 — 토큰 행을 내려받아 세면 max-rows 에 잘린다. */
export async function fetchPushReach(): Promise<ActionResult<PushReach>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("fn_admin_push_reach");
    if (error) throw error;

    const r = (data ?? {}) as {
      target_all: number;
      target_host: number;
      reachable_all: number;
      reachable_host: number;
      tokens_total: number;
      token_users: number;
      by_os: { os: string; tokens: number; users: number }[];
      stale_tokens: number;
    };

    return {
      targetAll: r.target_all ?? 0,
      targetHost: r.target_host ?? 0,
      reachableAll: r.reachable_all ?? 0,
      reachableHost: r.reachable_host ?? 0,
      tokensTotal: r.tokens_total ?? 0,
      tokenUsers: r.token_users ?? 0,
      byOs: r.by_os ?? [],
      staleTokens: r.stale_tokens ?? 0,
    };
  });
}

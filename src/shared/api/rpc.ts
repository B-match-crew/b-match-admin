/**
 * admin_db_spec.md §4 RPC 래퍼
 *
 * - service_role 키 (createAdminClient) 를 사용해 호출.
 * - 권한 검증은 RPC 내부에서 처리되므로, Server Action 진입 시점에
 *   호출자(auth.uid()) 의 admin_role 을 별도로 확인한 뒤 RPC 를 호출한다.
 *
 * 모든 함수는 Server Action 내부에서만 호출해야 한다.
 */

import { createAdminClient } from "./supabase-admin";

export interface SuspendUserParams {
  userId: number;
  /** ISO 8601 UTC */
  until: string;
  /** 10자 이상 */
  reason: string;
}

export async function rpcSuspendUser(p: SuspendUserParams) {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("fn_admin_suspend_user", {
    p_user_id: p.userId,
    p_until: p.until,
    p_reason: p.reason,
  });
  if (error) throw error;
}

export interface BanUserParams {
  userId: number;
  reason: string;
}

export async function rpcBanUser(p: BanUserParams) {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("fn_admin_ban_user", {
    p_user_id: p.userId,
    p_reason: p.reason,
  });
  if (error) throw error;
}

export interface DeleteMatchParams {
  matchId: number;
  reason: string;
}

export async function rpcDeleteMatch(p: DeleteMatchParams) {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("fn_admin_delete_match", {
    p_match_id: p.matchId,
    p_reason: p.reason,
  });
  if (error) throw error;
}

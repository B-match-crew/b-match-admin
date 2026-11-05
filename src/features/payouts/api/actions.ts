"use server";

import type { PayoutBalance, PayoutOverview, SettlementDetail } from "../model/types";

import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { runAction, type ActionResult } from "@/src/shared/lib/action-result";
import { requireAdmin } from "@/src/shared/lib/role-guard";
import {
  rpcPayoutAction,
  rpcPayoutSetEnabled,
  rpcSettlementApprove,
  rpcSettlementBuild,
  rpcSettlementCancel,
  type PayoutAction,
} from "@/src/shared/api/rpc";
import { REASON_MIN_LENGTH } from "@/src/shared/config/constants";

/**
 * 정산(app migration 138) 서버 액션.
 *
 * 조회 둘은 service_role(`fn_admin_payout_overview` · `fn_admin_settlement_detail`), 잔액은 Edge payple-hub(/balance —
 * 페이플 Hub 키는 Edge 에만 있다). 조치는 관리자 **세션** RPC(SUPER_ADMIN + 사유) — 감사 로그에 누가 했는지 남는다.
 * 어느 조치도 페이플을 부르지 않는다. 이체는 지급 시간(07~22시)에 1분 안에 Edge(/run)가 한다.
 */

export async function fetchPayoutOverview(): Promise<ActionResult<PayoutOverview>> {
  return runAction(async () => {
    await requireAdmin();
    const { data, error } = await createAdminClient().rpc("fn_admin_payout_overview");
    if (error) throw error;
    return data as PayoutOverview;
  });
}

export async function fetchSettlementDetail(id: number): Promise<ActionResult<SettlementDetail>> {
  return runAction(async () => {
    await requireAdmin();
    const { data, error } = await createAdminClient().rpc("fn_admin_settlement_detail", { p_id: id });
    if (error) throw error;
    return data as SettlementDetail;
  });
}

/**
 * 아직 회차에 안 들어간 결제 수 — 누적 결제를 훑는 집계라 개요(자동 새로고침)에서 빼고 버튼으로만 읽는다
 * (app migration 142 `fn_admin_payout_pending_payments`).
 */
export async function fetchPendingPayments(): Promise<ActionResult<{ pending_payments: number; pg_env: "TEST" | "LIVE" }>> {
  return runAction(async () => {
    await requireAdmin();
    const { data, error } = await createAdminClient().rpc("fn_admin_payout_pending_payments");
    if (error) throw error;
    return data as { pending_payments: number; pg_env: "TEST" | "LIVE" };
  });
}

/** 이체 가능 잔액 — Edge 가 프록시를 거쳐 페이플에 묻는다. 결과 코드가 A0000 이 아니면 그대로 보여 준다(T0310 등). */
export async function fetchPayoutBalance(): Promise<ActionResult<PayoutBalance>> {
  return runAction(async () => {
    await requireAdmin();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다");
    const res = await fetch(`${url}/functions/v1/payple-hub/balance`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (res.status === 503) throw new Error("정산 Edge 설정이 비어 있습니다 (PAYPLE_HUB_* 시크릿)");
    if (!res.ok) throw new Error(`잔액 조회 실패 (HTTP ${res.status})`);
    return (await res.json()) as PayoutBalance;
  });
}

function requireReason(reason: string) {
  if (reason.trim().length < REASON_MIN_LENGTH) {
    throw new Error(`사유는 ${REASON_MIN_LENGTH}자 이상 입력해야 합니다`);
  }
}

/** 회차 만들기 — ignoreHold 는 TEST 환경에서만(서버가 P0322 로 막는다). */
export async function buildSettlementsAction(p: {
  ignoreHold: boolean;
  reason: string;
}): Promise<ActionResult<{ created: number; carried: number; skipped: number; ids: number[] }>> {
  return runAction(async () => {
    requireReason(p.reason);
    await requireAdmin("SUPER_ADMIN");
    return await rpcSettlementBuild(p);
  });
}

export async function approveSettlementAction(p: {
  id: number;
  reason: string;
}): Promise<ActionResult<{ settlement_id: number; payout: { id: number; status: string; hold_reason: string | null } }>> {
  return runAction(async () => {
    requireReason(p.reason);
    await requireAdmin("SUPER_ADMIN");
    return await rpcSettlementApprove(p);
  });
}

export async function cancelSettlementAction(p: {
  id: number;
  reason: string;
}): Promise<ActionResult<{ settlement_id: number; items_released: number }>> {
  return runAction(async () => {
    requireReason(p.reason);
    await requireAdmin("SUPER_ADMIN");
    return await rpcSettlementCancel(p);
  });
}

export async function payoutAction(p: {
  action: PayoutAction;
  id: number;
  reason: string;
}): Promise<ActionResult<{ id: number; status: string; hold_reason: string | null }>> {
  return runAction(async () => {
    requireReason(p.reason);
    await requireAdmin("SUPER_ADMIN");
    return await rpcPayoutAction(p);
  });
}

export async function setPayoutsEnabledAction(p: {
  enabled: boolean;
  reason: string;
}): Promise<ActionResult<{ enabled: boolean }>> {
  return runAction(async () => {
    requireReason(p.reason);
    await requireAdmin("SUPER_ADMIN");
    return await rpcPayoutSetEnabled(p);
  });
}

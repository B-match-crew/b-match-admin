"use server";

import type {
  PaymentDetail,
  PaymentOverview,
  PaymentSearchParams,
  PaymentSearchResult,
  PaymentSettingsInput,
} from "../model/types";

import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { runAction, type ActionResult } from "@/src/shared/lib/action-result";
import { requireAdmin } from "@/src/shared/lib/role-guard";
import { kstDayBounds } from "@/src/shared/lib/kst-range";
import {
  rpcPaymentForceRefund,
  rpcPaymentRecheck,
  rpcPaymentRetryRefund,
  rpcPaymentSetSettings,
} from "@/src/shared/api/rpc";
import { REASON_MIN_LENGTH } from "@/src/shared/config/constants";

/**
 * 결제(app migration 136 · 137) 서버 액션.
 *
 * 조회 셋은 service_role(`fn_admin_payment_*` — 결제 표는 노출 안 된 스키마라 RPC 로만) — requireAdmin() 뒤에.
 * 조치 넷은 관리자 **세션** RPC — 누가 했는지를 서버가 감사 로그에 남긴다. 돈이 움직이는 조치(강제 환불 ·
 * 재시도)는 환불 큐에 넣을 뿐이고, 페이플 취소는 Edge payple(/reconcile)이 1분 안에 실행한다.
 */

export async function fetchPaymentOverview(p: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<ActionResult<PaymentOverview>> {
  return runAction(async () => {
    await requireAdmin();
    const { data, error } = await createAdminClient().rpc("fn_admin_payment_overview", {
      p_from: p.dateFrom ? kstDayBounds(p.dateFrom).start : null,
      p_to: p.dateTo ? kstDayBounds(p.dateTo).end : null,
    });
    if (error) throw error;
    return data as PaymentOverview;
  });
}

export async function fetchPayments(
  p: PaymentSearchParams
): Promise<ActionResult<PaymentSearchResult>> {
  return runAction(async () => {
    await requireAdmin();
    const { data, error } = await createAdminClient().rpc("fn_admin_payment_list", {
      p_from: p.dateFrom ? kstDayBounds(p.dateFrom).start : null,
      p_to: p.dateTo ? kstDayBounds(p.dateTo).end : null,
      p_statuses: p.statuses && p.statuses.length > 0 ? p.statuses : null,
      p_env: p.env ?? null,
      p_query: p.query?.trim() ? p.query.trim().slice(0, 100) : null,
      p_limit: p.limit,
      p_offset: p.offset,
    });
    if (error) throw error;
    return data as PaymentSearchResult;
  });
}

export async function fetchPaymentDetail(
  orderNo: string
): Promise<ActionResult<PaymentDetail | null>> {
  return runAction(async () => {
    await requireAdmin();
    const { data, error } = await createAdminClient().rpc("fn_admin_payment_detail", {
      p_order_no: orderNo,
    });
    if (error) throw error;
    return (data as PaymentDetail | null) ?? null;
  });
}

// ─── 조치 ───

function requireReason(reason: string) {
  if (reason.trim().length < REASON_MIN_LENGTH) {
    throw new Error(`사유는 ${REASON_MIN_LENGTH}자 이상 입력해야 합니다`);
  }
}

/** 상태 재조회 — 결과 모름의 임대를 풀어 다음 분 reconcile 이 바로 페이플에 묻게 한다. */
export async function recheckPaymentAction(orderNo: string): Promise<
  ActionResult<{ attempts: number; refunds: number; status: string }>
> {
  return runAction(async () => {
    await requireAdmin();
    return await rpcPaymentRecheck(orderNo);
  });
}

/** 강제 환불(전액) — 환불 큐에 넣는다. 실행은 1분 안에 Edge 가. */
export async function forceRefundAction(p: {
  orderNo: string;
  reason: string;
  requestKey: string;
}): Promise<ActionResult<{ result: string; amount?: number }>> {
  return runAction(async () => {
    requireReason(p.reason);
    await requireAdmin("SUPER_ADMIN");
    return await rpcPaymentForceRefund(p);
  });
}

/** 환불 재시도 — REFUND_FAILED 를 새 환불 건으로 다시 큐에. */
export async function retryRefundAction(p: {
  orderNo: string;
  reason: string;
  requestKey: string;
}): Promise<ActionResult<{ result: string; amount?: number }>> {
  return runAction(async () => {
    requireReason(p.reason);
    await requireAdmin("SUPER_ADMIN");
    return await rpcPaymentRetryRefund(p);
  });
}

/** 킬 스위치 · 테스트 금액 · 최대 금액. */
export async function setPaymentSettingsAction(
  p: PaymentSettingsInput
): Promise<ActionResult<{ payments_enabled: boolean; test_amount: number; max_amount: number }>> {
  return runAction(async () => {
    requireReason(p.reason);
    await requireAdmin("SUPER_ADMIN");
    return await rpcPaymentSetSettings(p);
  });
}

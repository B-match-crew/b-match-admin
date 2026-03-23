import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SettlementRequest,
  SettlementStatus,
  RefundRequest,
} from "@/src/entities/settlement/types";

// --- 호스트 정산 ---

interface FetchSettlementsParams {
  status?: "all" | SettlementStatus;
  page?: number;
  limit?: number;
}

interface FetchSettlementsResult {
  settlements: SettlementRequest[];
  totalCount: number;
}

export async function fetchSettlements(
  supabase: SupabaseClient,
  { status = "all", page = 1, limit = 20 }: FetchSettlementsParams
): Promise<FetchSettlementsResult> {
  let query = supabase
    .from("settlement_requests")
    .select(
      "*, host:users!settlement_requests_host_id_fkey(nickname, real_name)",
      { count: "exact" }
    );

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`정산 목록 조회 실패: ${error.message}`);
  }

  return {
    settlements: (data ?? []) as unknown as SettlementRequest[],
    totalCount: count ?? 0,
  };
}

/**
 * 정산 상태를 EXPORTED로 변경 (TSV 내보내기 시)
 */
export async function markSettlementsExported(
  supabase: SupabaseClient,
  ids: string[],
  adminId: string
): Promise<void> {
  const { error } = await supabase
    .from("settlement_requests")
    .update({ status: "EXPORTED" })
    .in("id", ids)
    .eq("status", "PENDING");

  if (error) {
    throw new Error(`정산 내보내기 실패: ${error.message}`);
  }

  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: "EXPORT_SETTLEMENTS",
    target_type: "SETTLEMENT",
    target_id: ids[0],
    reason: `${ids.length}건 정산 내보내기`,
  });
}

/**
 * 정산 완료 처리
 * 이중 송금 방어: EXPORTED 상태인 것만 COMPLETED로 변경 가능
 */
export async function completeSettlement(
  supabase: SupabaseClient,
  id: string,
  adminId: string
): Promise<void> {
  // 이중 송금 방어: 현재 상태 확인
  const { data: current } = await supabase
    .from("settlement_requests")
    .select("status")
    .eq("id", id)
    .single();

  if (!current) throw new Error("정산 요청을 찾을 수 없습니다");
  if (current.status === "COMPLETED") throw new Error("이미 완료된 정산입니다 (이중 송금 방어)");
  if (current.status !== "EXPORTED") throw new Error("EXPORTED 상태만 완료 처리할 수 있습니다");

  const { error } = await supabase
    .from("settlement_requests")
    .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "EXPORTED"); // 낙관적 잠금

  if (error) {
    throw new Error(`정산 완료 처리 실패: ${error.message}`);
  }

  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: "COMPLETE_SETTLEMENT",
    target_type: "SETTLEMENT",
    target_id: id,
    reason: "정산 완료 처리",
  });
}

/**
 * 정산 실패 처리
 */
export async function failSettlement(
  supabase: SupabaseClient,
  id: string,
  adminId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from("settlement_requests")
    .update({ status: "FAILED" })
    .eq("id", id);

  if (error) {
    throw new Error(`정산 실패 처리 실패: ${error.message}`);
  }

  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: "FAIL_SETTLEMENT",
    target_type: "SETTLEMENT",
    target_id: id,
    reason,
  });
}

// --- 게스트 환불 ---

interface FetchRefundsParams {
  status?: "all" | SettlementStatus;
  page?: number;
  limit?: number;
}

interface FetchRefundsResult {
  refunds: RefundRequest[];
  totalCount: number;
}

export async function fetchRefunds(
  supabase: SupabaseClient,
  { status = "all", page = 1, limit = 20 }: FetchRefundsParams
): Promise<FetchRefundsResult> {
  let query = supabase
    .from("refund_requests")
    .select(
      "*, guest:users!refund_requests_guest_id_fkey(nickname, real_name), match:matches!refund_requests_match_id_fkey(title)",
      { count: "exact" }
    );

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`환불 목록 조회 실패: ${error.message}`);
  }

  return {
    refunds: (data ?? []) as unknown as RefundRequest[],
    totalCount: count ?? 0,
  };
}

export async function markRefundsExported(
  supabase: SupabaseClient,
  ids: string[],
  adminId: string
): Promise<void> {
  const { error } = await supabase
    .from("refund_requests")
    .update({ status: "EXPORTED" })
    .in("id", ids)
    .eq("status", "PENDING");

  if (error) {
    throw new Error(`환불 내보내기 실패: ${error.message}`);
  }

  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: "EXPORT_REFUNDS",
    target_type: "REFUND",
    target_id: ids[0],
    reason: `${ids.length}건 환불 내보내기`,
  });
}

export async function completeRefund(
  supabase: SupabaseClient,
  id: string,
  adminId: string
): Promise<void> {
  const { data: current } = await supabase
    .from("refund_requests")
    .select("status")
    .eq("id", id)
    .single();

  if (!current) throw new Error("환불 요청을 찾을 수 없습니다");
  if (current.status === "COMPLETED") throw new Error("이미 완료된 환불입니다 (이중 송금 방어)");
  if (current.status !== "EXPORTED") throw new Error("EXPORTED 상태만 완료 처리할 수 있습니다");

  const { error } = await supabase
    .from("refund_requests")
    .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "EXPORTED");

  if (error) {
    throw new Error(`환불 완료 처리 실패: ${error.message}`);
  }

  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: "COMPLETE_REFUND",
    target_type: "REFUND",
    target_id: id,
    reason: "환불 완료 처리",
  });
}

export async function failRefund(
  supabase: SupabaseClient,
  id: string,
  adminId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from("refund_requests")
    .update({ status: "FAILED" })
    .eq("id", id);

  if (error) {
    throw new Error(`환불 실패 처리 실패: ${error.message}`);
  }

  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: "FAIL_REFUND",
    target_type: "REFUND",
    target_id: id,
    reason,
  });
}

// --- TSV 생성 (토스뱅크 대량이체 호환) ---

/**
 * 정산 요청을 토스뱅크 대량이체 호환 TSV로 변환
 * 컬럼: 은행명\t계좌번호\t예금주\t이체금액\t메모
 */
export function generateSettlementTSV(items: SettlementRequest[]): string {
  const header = "은행명\t계좌번호\t예금주\t이체금액\t메모";
  const rows = items.map(
    (item) =>
      `${item.bank_info.bank_name}\t${item.bank_info.account_no}\t${item.bank_info.holder_name}\t${item.amount}\t정산#${item.id}`
  );
  return [header, ...rows].join("\n");
}

/**
 * 환불 요청을 토스뱅크 대량이체 호환 TSV로 변환
 */
export function generateRefundTSV(items: RefundRequest[]): string {
  const header = "은행명\t계좌번호\t예금주\t이체금액\t메모";
  const rows = items
    .filter((item) => item.bank_info)
    .map(
      (item) =>
        `${item.bank_info!.bank_name}\t${item.bank_info!.account_no}\t${item.bank_info!.holder_name}\t${item.amount}\t환불#${item.id}`
    );
  return [header, ...rows].join("\n");
}

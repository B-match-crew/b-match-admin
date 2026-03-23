import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SettlementRequest,
  RefundRequest,
  SettlementStatus,
} from "@/src/entities/settlement/types";

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

  const settlements: SettlementRequest[] = (data ?? []).map((item) => {
    const row = item as Record<string, unknown>;
    return {
      ...(row as unknown as SettlementRequest),
      host: row.host as { nickname: string; real_name: string | null } | null,
    };
  });

  return { settlements, totalCount: count ?? 0 };
}

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

  const refunds: RefundRequest[] = (data ?? []).map((item) => {
    const row = item as Record<string, unknown>;
    return {
      ...(row as unknown as RefundRequest),
      guest: row.guest as { nickname: string; real_name: string | null } | null,
      match: row.match as { title: string } | null,
    };
  });

  return { refunds, totalCount: count ?? 0 };
}

export async function updateSettlementStatus(
  supabase: SupabaseClient,
  ids: number[],
  newStatus: SettlementStatus,
  adminId: string,
  reason?: string
): Promise<void> {
  const updateData: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (newStatus === "COMPLETED") {
    updateData.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("settlement_requests")
    .update(updateData)
    .in("id", ids);

  if (error) {
    throw new Error(`정산 상태 변경 실패: ${error.message}`);
  }

  const actionType =
    newStatus === "COMPLETED"
      ? "APPROVE_SETTLEMENT"
      : newStatus === "FAILED"
        ? "FAIL_SETTLEMENT"
        : "APPROVE_SETTLEMENT";

  for (const id of ids) {
    await supabase.from("admin_audit_logs").insert({
      admin_id: adminId,
      action_type: actionType,
      target_type: "SETTLEMENT",
      target_id: id,
      reason: reason ?? `상태 변경: ${newStatus}`,
    });
  }
}

export async function retryRefund(
  supabase: SupabaseClient,
  refundId: number,
  adminId: string
): Promise<void> {
  const { error } = await supabase
    .from("refund_requests")
    .update({
      status: "PENDING",
      updated_at: new Date().toISOString(),
    })
    .eq("id", refundId);

  if (error) {
    throw new Error(`환불 재시도 실패: ${error.message}`);
  }

  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: "APPROVE_REFUND",
    target_type: "REFUND",
    target_id: refundId,
    reason: "PG 환불 재시도",
  });
}

export function generateTossBulkTransferText(
  settlements: SettlementRequest[]
): string {
  return settlements
    .map((s) =>
      [
        s.bank_info.bank_name,
        s.bank_info.account_no,
        s.amount,
        s.bank_info.holder_name,
        "비매치정산",
        s.host?.nickname ?? s.bank_info.holder_name,
      ].join("\t")
    )
    .join("\n");
}

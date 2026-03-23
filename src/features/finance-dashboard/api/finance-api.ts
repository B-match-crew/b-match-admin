import type { SupabaseClient } from "@supabase/supabase-js";

export interface FinanceSummary {
  totalRevenue: number;
  totalRefunded: number;
  pendingSettlements: number;
  pendingRefunds: number;
  completedSettlements: number;
  failedSettlements: number;
  pendingSettlementCount: number;
  pendingRefundCount: number;
}

export async function fetchFinanceSummary(
  supabase: SupabaseClient
): Promise<FinanceSummary> {
  // 총 거래액 (PAID + REFUNDED 상태의 결제)
  const { data: payments } = await supabase
    .from("payments")
    .select("amount, refunded_amount, status");

  const totalRevenue = (payments ?? [])
    .filter((p) => p.status === "PAID" || p.status === "REFUNDED")
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const totalRefunded = (payments ?? []).reduce(
    (sum, p) => sum + (p.refunded_amount ?? 0),
    0
  );

  // 정산 대기 금액/건수
  const { data: pendingSettlementData, count: pendingSettlementCount } =
    await supabase
      .from("settlement_requests")
      .select("amount", { count: "exact" })
      .eq("status", "PENDING");

  const pendingSettlements = (pendingSettlementData ?? []).reduce(
    (sum, s) => sum + (s.amount ?? 0),
    0
  );

  // 환불 대기 금액/건수
  const { data: pendingRefundData, count: pendingRefundCount } = await supabase
    .from("refund_requests")
    .select("amount", { count: "exact" })
    .eq("status", "PENDING");

  const pendingRefunds = (pendingRefundData ?? []).reduce(
    (sum, r) => sum + (r.amount ?? 0),
    0
  );

  // 완료된 정산
  const { data: completedData } = await supabase
    .from("settlement_requests")
    .select("amount")
    .eq("status", "COMPLETED");

  const completedSettlements = (completedData ?? []).reduce(
    (sum, s) => sum + (s.amount ?? 0),
    0
  );

  // 실패한 정산
  const { data: failedData } = await supabase
    .from("settlement_requests")
    .select("amount")
    .eq("status", "FAILED");

  const failedSettlements = (failedData ?? []).reduce(
    (sum, s) => sum + (s.amount ?? 0),
    0
  );

  return {
    totalRevenue,
    totalRefunded,
    pendingSettlements,
    pendingRefunds,
    completedSettlements,
    failedSettlements,
    pendingSettlementCount: pendingSettlementCount ?? 0,
    pendingRefundCount: pendingRefundCount ?? 0,
  };
}

export interface RecentTransaction {
  id: string;
  type: "payment" | "settlement" | "refund";
  amount: number;
  status: string;
  label: string;
  created_at: string;
}

export async function fetchRecentTransactions(
  supabase: SupabaseClient,
  limit = 10
): Promise<RecentTransaction[]> {
  const transactions: RecentTransaction[] = [];

  // 최근 결제
  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, status, created_at, match:matches(title)")
    .order("created_at", { ascending: false })
    .limit(limit);

  for (const p of payments ?? []) {
    const row = p as Record<string, unknown>;
    const matchArr = row.match as { title: string }[] | null;
    transactions.push({
      id: row.id as string,
      type: "payment",
      amount: row.amount as number,
      status: row.status as string,
      label: matchArr?.[0]?.title ?? `결제 #${row.id}`,
      created_at: row.created_at as string,
    });
  }

  // 최근 정산
  const { data: settlements } = await supabase
    .from("settlement_requests")
    .select("id, amount, status, created_at, host:users!settlement_requests_host_id_fkey(nickname)")
    .order("created_at", { ascending: false })
    .limit(limit);

  for (const s of settlements ?? []) {
    const row = s as Record<string, unknown>;
    const hostArr = row.host as { nickname: string }[] | null;
    transactions.push({
      id: row.id as string,
      type: "settlement",
      amount: row.amount as number,
      status: row.status as string,
      label: hostArr?.[0]?.nickname ?? `정산 #${row.id}`,
      created_at: row.created_at as string,
    });
  }

  // 최근 환불
  const { data: refunds } = await supabase
    .from("refund_requests")
    .select("id, amount, status, created_at, guest:users!refund_requests_guest_id_fkey(nickname)")
    .order("created_at", { ascending: false })
    .limit(limit);

  for (const r of refunds ?? []) {
    const row = r as Record<string, unknown>;
    const guestArr = row.guest as { nickname: string }[] | null;
    transactions.push({
      id: row.id as string,
      type: "refund",
      amount: row.amount as number,
      status: row.status as string,
      label: guestArr?.[0]?.nickname ?? `환불 #${row.id}`,
      created_at: row.created_at as string,
    });
  }

  // 최신순 정렬 후 limit
  transactions.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return transactions.slice(0, limit);
}

import type { SupabaseClient } from "@supabase/supabase-js";

export interface FinanceSummary {
  totalTransactionAmount: number;
  totalRefundAmount: number;
  totalPendingBalance: number;
  totalFrozenBalance: number;
  totalPgFees: number;
  monthlyTransactionAmount: number;
  monthlyRefundAmount: number;
  monthlyPgFees: number;
}

export interface DailyTransaction {
  date: string;
  amount: number;
  refundAmount: number;
  count: number;
}

export interface PaymentMethodRatio {
  method: string;
  count: number;
  amount: number;
}

export async function fetchFinanceSummary(
  supabase: SupabaseClient
): Promise<FinanceSummary> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [paymentsResult, walletsResult, monthlyPaymentsResult, monthlyRefundsResult] =
    await Promise.all([
      supabase
        .from("payments")
        .select("amount, refunded_amount, pg_fee, status"),
      supabase
        .from("host_wallets")
        .select("pending_balance, frozen_balance"),
      supabase
        .from("payments")
        .select("amount, pg_fee")
        .eq("status", "PAID")
        .gte("created_at", monthStart),
      supabase
        .from("payments")
        .select("refunded_amount, pg_fee")
        .in("status", ["REFUNDED", "REFUND_PENDING"])
        .gte("updated_at", monthStart),
    ]);

  const payments = paymentsResult.data ?? [];
  const wallets = walletsResult.data ?? [];
  const monthlyPayments = monthlyPaymentsResult.data ?? [];
  const monthlyRefunds = monthlyRefundsResult.data ?? [];

  const totalTransactionAmount = payments
    .filter((p) => p.status === "PAID" || p.status === "REFUNDED")
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const totalRefundAmount = payments.reduce(
    (sum, p) => sum + (p.refunded_amount ?? 0),
    0
  );

  const totalPgFees = payments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + (p.pg_fee ?? 0), 0);

  const totalPendingBalance = wallets.reduce(
    (sum, w) => sum + (w.pending_balance ?? 0),
    0
  );

  const totalFrozenBalance = wallets.reduce(
    (sum, w) => sum + (w.frozen_balance ?? 0),
    0
  );

  const monthlyTransactionAmount = monthlyPayments.reduce(
    (sum, p) => sum + (p.amount ?? 0),
    0
  );

  const monthlyRefundAmount = monthlyRefunds.reduce(
    (sum, p) => sum + (p.refunded_amount ?? 0),
    0
  );

  const monthlyPgFees = monthlyPayments.reduce(
    (sum, p) => sum + (p.pg_fee ?? 0),
    0
  );

  return {
    totalTransactionAmount,
    totalRefundAmount,
    totalPendingBalance,
    totalFrozenBalance,
    totalPgFees,
    monthlyTransactionAmount,
    monthlyRefundAmount,
    monthlyPgFees,
  };
}

export async function fetchDailyTransactions(
  supabase: SupabaseClient,
  days: number = 30
): Promise<DailyTransaction[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from("payments")
    .select("amount, refunded_amount, status, created_at")
    .gte("created_at", startDate.toISOString())
    .in("status", ["PAID", "REFUNDED", "REFUND_PENDING"])
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`일별 거래 조회 실패: ${error.message}`);
  }

  const dailyMap = new Map<string, DailyTransaction>();

  for (const payment of data ?? []) {
    const date = payment.created_at.split("T")[0];
    const existing = dailyMap.get(date) ?? {
      date,
      amount: 0,
      refundAmount: 0,
      count: 0,
    };

    existing.amount += payment.amount ?? 0;
    existing.refundAmount += payment.refunded_amount ?? 0;
    existing.count += 1;
    dailyMap.set(date, existing);
  }

  return Array.from(dailyMap.values());
}

export function generateFinanceTsv(
  summary: FinanceSummary,
  dailyData: DailyTransaction[]
): string {
  const headers = ["날짜", "거래액", "환불액", "건수"];
  const rows = dailyData.map((d) =>
    [d.date, d.amount, d.refundAmount, d.count].join("\t")
  );

  const summarySection = [
    `총 거래액\t${summary.totalTransactionAmount}`,
    `총 환불액\t${summary.totalRefundAmount}`,
    `미정산(에스크로)\t${summary.totalPendingBalance}`,
    `동결액\t${summary.totalFrozenBalance}`,
    `당월 PG 수수료\t${summary.monthlyPgFees}`,
    "",
  ];

  return [...summarySection, headers.join("\t"), ...rows].join("\n");
}

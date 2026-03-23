"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import { formatCurrency } from "@/src/shared/lib/format-number";

interface FinanceHealthData {
  monthlyPgFees: number;
  refundLosses: number;
  pendingEscrow: number;
}

export function FinanceHealthWidget() {
  const supabase = useSupabase();
  const [data, setData] = useState<FinanceHealthData | null>(null);

  useEffect(() => {
    async function fetchFinanceData() {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [pgFeesRes, refundLossesRes, pendingEscrowRes] = await Promise.all([
        supabase
          .from("payments")
          .select("pg_fee")
          .eq("status", "PAID")
          .gte("created_at", monthStart.toISOString()),
        supabase
          .from("payments")
          .select("amount")
          .eq("status", "REFUNDED")
          .gte("created_at", monthStart.toISOString()),
        supabase
          .from("host_wallets")
          .select("pending_amount"),
      ]);

      const monthlyPgFees = (pgFeesRes.data ?? []).reduce(
        (sum, row) => sum + (row.pg_fee ?? 0),
        0
      );

      const refundLosses = (refundLossesRes.data ?? []).reduce(
        (sum, row) => sum + (row.amount ?? 0),
        0
      );

      const pendingEscrow = (pendingEscrowRes.data ?? []).reduce(
        (sum, row) => sum + (row.pending_amount ?? 0),
        0
      );

      setData({ monthlyPgFees, refundLosses, pendingEscrow });
    }
    fetchFinanceData();
  }, [supabase]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wallet className="h-5 w-5 text-primary" />
          재무 건강
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!data ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <FinanceRow
              label="당월 PG 수수료"
              value={formatCurrency(data.monthlyPgFees)}
              variant="neutral"
            />
            <FinanceRow
              label="당월 환불 손실금"
              value={formatCurrency(data.refundLosses)}
              variant={data.refundLosses > 0 ? "warning" : "neutral"}
            />
            <FinanceRow
              label="미출금 에스크로 잔액"
              value={formatCurrency(data.pendingEscrow)}
              variant="info"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FinanceRow({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: "neutral" | "warning" | "info";
}) {
  const variantStyles = {
    neutral: "border-border bg-muted/50",
    warning: "border-yellow-200 bg-yellow-50",
    info: "border-blue-200 bg-blue-50",
  };

  const textStyles = {
    neutral: "text-foreground",
    warning: "text-yellow-700",
    info: "text-blue-700",
  };

  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-4 py-3 ${variantStyles[variant]}`}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-bold ${textStyles[variant]}`}>
        {value}
      </span>
    </div>
  );
}

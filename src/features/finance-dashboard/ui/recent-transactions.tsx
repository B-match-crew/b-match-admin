"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { formatCurrency } from "@/src/shared/lib/format-number";
import { formatDateTime } from "@/src/shared/lib/format-date";
import type { RecentTransaction } from "../api/finance-api";
import { Badge } from "@/components/ui/badge";

interface RecentTransactionsProps {
  transactions: RecentTransaction[];
}

const typeLabels: Record<string, { label: string; style: string }> = {
  payment: { label: "결제", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  settlement: { label: "정산", style: "bg-blue-50 text-blue-700 border-blue-200" },
  refund: { label: "환불", style: "bg-orange-50 text-orange-700 border-orange-200" },
};

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">최근 거래 내역</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            거래 내역이 없습니다
          </p>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => {
              const typeConfig = typeLabels[tx.type];
              return (
                <div
                  key={`${tx.type}-${tx.id}`}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={typeConfig.style}>
                      {typeConfig.label}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{tx.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(tx.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={tx.status} />
                    <span className="text-sm font-semibold">
                      {tx.type === "refund" ? "-" : ""}
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

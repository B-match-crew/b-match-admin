"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/src/shared/lib/format-number";
import type { FinanceSummary } from "../api/finance-api";
import {
  Wallet,
  ArrowDownLeft,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
} from "lucide-react";

interface FinanceSummaryCardsProps {
  summary: FinanceSummary;
}

export function FinanceSummaryCards({ summary }: FinanceSummaryCardsProps) {
  const cards = [
    {
      title: "총 거래액",
      value: formatCurrency(summary.totalRevenue),
      icon: Wallet,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "총 환불액",
      value: formatCurrency(summary.totalRefunded),
      icon: RotateCcw,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "정산 대기",
      value: formatCurrency(summary.pendingSettlements),
      subtitle: `${summary.pendingSettlementCount}건`,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      title: "환불 대기",
      value: formatCurrency(summary.pendingRefunds),
      subtitle: `${summary.pendingRefundCount}건`,
      icon: ArrowDownLeft,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "정산 완료",
      value: formatCurrency(summary.completedSettlements),
      icon: CheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "정산 실패",
      value: formatCurrency(summary.failedSettlements),
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`rounded-lg p-2 ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            {card.subtitle && (
              <p className="text-xs text-muted-foreground mt-1">
                {card.subtitle}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

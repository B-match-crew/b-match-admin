"use client";

import type { FinanceSummary } from "../api/finance-api";
import { formatCurrency } from "@/src/shared/lib/format-number";
import {
  Wallet,
  RefreshCcw,
  Clock,
  Lock,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Receipt,
} from "lucide-react";

interface FinanceSummaryCardsProps {
  summary: FinanceSummary;
}

export function FinanceSummaryCards({ summary }: FinanceSummaryCardsProps) {
  const cards = [
    {
      title: "총 거래액",
      value: formatCurrency(summary.totalTransactionAmount),
      icon: Wallet,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "총 환불액",
      value: formatCurrency(summary.totalRefundAmount),
      icon: RefreshCcw,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "미정산 (에스크로)",
      value: formatCurrency(summary.totalPendingBalance),
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      title: "동결액",
      value: formatCurrency(summary.totalFrozenBalance),
      icon: Lock,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
  ];

  const monthlyCards = [
    {
      title: "당월 거래액",
      value: formatCurrency(summary.monthlyTransactionAmount),
      icon: TrendingUp,
      color: "text-emerald-600",
    },
    {
      title: "당월 환불액",
      value: formatCurrency(summary.monthlyRefundAmount),
      icon: TrendingDown,
      color: "text-red-600",
    },
    {
      title: "당월 PG 수수료",
      value: formatCurrency(summary.monthlyPgFees),
      icon: CreditCard,
      color: "text-orange-600",
    },
    {
      title: "당월 환불 손실 추정",
      value: formatCurrency(
        summary.monthlyRefundAmount > 0
          ? Math.ceil(summary.monthlyRefundAmount / summary.monthlyTransactionAmount * summary.monthlyPgFees) + Math.ceil(summary.monthlyRefundAmount / 10000) * 500
          : 0
      ),
      icon: Receipt,
      color: "text-red-600",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-lg border bg-card p-4"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bgColor}`}
              >
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-lg font-bold">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {monthlyCards.map((card) => (
          <div
            key={card.title}
            className="rounded-lg border bg-card p-3"
          >
            <div className="flex items-center gap-2">
              <card.icon className={`h-4 w-4 ${card.color}`} />
              <span className="text-sm text-muted-foreground">{card.title}</span>
            </div>
            <p className={`mt-1 text-base font-semibold ${card.color}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

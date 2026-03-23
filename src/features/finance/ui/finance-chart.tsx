"use client";

import type { DailyTransaction } from "../api/finance-api";
import { formatNumber } from "@/src/shared/lib/format-number";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface FinanceChartProps {
  data: DailyTransaction[];
}

export function FinanceChart({ data }: FinanceChartProps) {
  const chartData = data.map((d) => ({
    date: d.date.slice(5),
    거래액: d.amount,
    환불액: d.refundAmount,
    건수: d.count,
  }));

  if (chartData.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        거래 데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-4 text-sm font-semibold">일별 거래 추이</h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            className="fill-muted-foreground"
          />
          <YAxis
            tickFormatter={(v) => formatNumber(v)}
            tick={{ fontSize: 12 }}
            className="fill-muted-foreground"
          />
          <Tooltip
            formatter={(value) => formatNumber(Number(value))}
            labelFormatter={(label) => `날짜: ${label}`}
          />
          <Legend />
          <Bar dataKey="거래액" fill="#10b981" radius={[2, 2, 0, 0]} />
          <Bar dataKey="환불액" fill="#ef4444" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

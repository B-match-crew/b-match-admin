"use client";

import { useEffect } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { fetchFunnelData } from "../api/analytics-api";
import { useAnalyticsStore } from "../model/analytics-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/src/shared/ui/loading-spinner";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { formatNumber } from "@/src/shared/lib/format-number";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowDown } from "lucide-react";

export function FunnelChart() {
  const supabase = useSupabase();
  const { funnel, isLoading, setFunnel, setIsLoading } = useAnalyticsStore();

  useEffect(() => {
    setIsLoading(true);
    fetchFunnelData(supabase)
      .then((data) => setFunnel(data))
      .finally(() => setIsLoading(false));
  }, [supabase, setFunnel, setIsLoading]);

  if (isLoading) return <LoadingSpinner />;

  if (funnel.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState description="퍼널 데이터가 없습니다" />
        </CardContent>
      </Card>
    );
  }

  const chartData = funnel.map((step) => ({
    name: step.label,
    사용자수: step.count,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">퍼널 차트</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ left: 20, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 13 }}
                  width={100}
                />
                <Tooltip />
                <Bar
                  dataKey="사용자수"
                  fill="hsl(var(--chart-1))"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">단계별 전환율</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {funnel.map((step, index) => (
              <div key={step.step}>
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {step.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(step.count)}명
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {index === 0 ? (
                      <span className="text-sm text-muted-foreground">
                        시작
                      </span>
                    ) : (
                      <span
                        className={`text-sm font-semibold ${
                          step.conversionRate >= 50
                            ? "text-emerald-600"
                            : step.conversionRate >= 20
                              ? "text-yellow-600"
                              : "text-red-600"
                        }`}
                      >
                        {step.conversionRate}%
                      </span>
                    )}
                  </div>
                </div>
                {index < funnel.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ArrowDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

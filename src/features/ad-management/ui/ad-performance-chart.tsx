"use client";

import { useEffect } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { fetchAdPerformance } from "../api/ad-api";
import { useAdStore } from "../model/ad-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/src/shared/ui/loading-spinner";
import { EmptyState } from "@/src/shared/ui/empty-state";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export function AdPerformanceChart() {
  const supabase = useSupabase();
  const { performance, isLoading, setPerformance, setIsLoading } = useAdStore();

  useEffect(() => {
    setIsLoading(true);
    fetchAdPerformance(supabase)
      .then((data) => setPerformance(data))
      .finally(() => setIsLoading(false));
  }, [supabase, setPerformance, setIsLoading]);

  if (isLoading) return <LoadingSpinner />;

  if (performance.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState description="광고 성과 데이터가 없습니다" />
        </CardContent>
      </Card>
    );
  }

  const chartData = performance.map((item) => ({
    name: item.advertiserName.length > 8
      ? item.advertiserName.slice(0, 8) + "..."
      : item.advertiserName,
    클릭수: item.clickCount,
    노출수: item.impressionCount,
    CTR: Number(item.ctr.toFixed(2)),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">광고별 클릭 / 노출 현황</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="클릭수"
                fill="hsl(var(--chart-1))"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="노출수"
                fill="hsl(var(--chart-2))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

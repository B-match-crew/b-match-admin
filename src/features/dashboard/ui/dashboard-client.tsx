"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Flag, CalendarDays, Megaphone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchDashboardStats,
  fetchDailyTrends,
} from "@/src/features/dashboard/actions";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export function DashboardClient() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    refetchInterval: 60 * 1000,
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ["dashboard-trends"],
    queryFn: () => fetchDailyTrends(14),
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today DAU"
          value={data?.todayDau}
          loading={isLoading}
          icon={<Users className="h-5 w-5 text-primary" />}
          hint="오늘 활동 토큰 기준 (간이)"
        />
        <StatCard
          title="미처리 신고"
          value={data?.pendingReports}
          loading={isLoading}
          icon={<Flag className="h-5 w-5 text-destructive" />}
          href="/reports"
          highlight={Boolean(data?.pendingReports && data.pendingReports > 0)}
        />
        <StatCard
          title="오늘 예정 모임"
          value={data?.todayMatches}
          loading={isLoading}
          icon={<CalendarDays className="h-5 w-5 text-blue-500" />}
          href="/matches"
        />
        <StatCard
          title="모집 중 모임"
          value={data?.recruitingMatches}
          loading={isLoading}
          icon={<Megaphone className="h-5 w-5 text-emerald-500" />}
          href="/matches"
        />
      </div>

      {/* 시계열 차트 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            최근 14일 추이 (신고 / 매칭 등록)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trendsLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : trends && trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(v) => String(v)}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="reports"
                  name="신고"
                  stroke="hsl(0, 72%, 51%)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="matches"
                  name="매칭 등록"
                  stroke="hsl(142, 71%, 45%)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              데이터가 없습니다
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  loading,
  icon,
  hint,
  href,
  highlight,
}: {
  title: string;
  value?: number;
  loading: boolean;
  icon: React.ReactNode;
  hint?: string;
  href?: string;
  highlight?: boolean;
}) {
  const card = (
    <Card className={highlight ? "border-destructive/50" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-3xl font-bold">
            {(value ?? 0).toLocaleString()}
          </div>
        )}
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-opacity hover:opacity-90">
        {card}
      </Link>
    );
  }
  return card;
}

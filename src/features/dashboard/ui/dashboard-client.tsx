"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Flag, CalendarDays, Megaphone } from "lucide-react";
import { fetchDashboardStats } from "@/src/features/dashboard/actions";
import Link from "next/link";

export function DashboardClient() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    refetchInterval: 60 * 1000,
  });

  return (
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
        <div className="text-3xl font-bold">
          {loading ? "—" : (value ?? 0).toLocaleString()}
        </div>
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

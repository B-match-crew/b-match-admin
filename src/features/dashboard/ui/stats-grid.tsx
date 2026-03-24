"use client";

import { useEffect, useState } from "react";
import {
  getDashboardStats,
  type DashboardStats,
} from "../api/get-dashboard-stats";
import { StatsCard } from "./stats-card";
import { LoadingSpinner } from "@/src/shared/ui/loading-spinner";
import { Users, UserPlus, Swords, Flag } from "lucide-react";
import { formatNumber } from "@/src/shared/lib/format-number";

export function StatsGrid() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getDashboardStats().then((data) => {
      setStats(data);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) return <LoadingSpinner />;
  if (!stats) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="누적 유저 수"
        value={formatNumber(stats.totalUsers)}
        icon={Users}
      />
      <StatsCard
        title="오늘 신규 가입"
        value={formatNumber(stats.todayNewUsers)}
        icon={UserPlus}
      />
      <StatsCard
        title="진행 중 매칭"
        value={formatNumber(stats.activeMatches)}
        icon={Swords}
      />
      <StatsCard
        title="미처리 신고"
        value={formatNumber(stats.pendingReports)}
        icon={Flag}
      />
    </div>
  );
}

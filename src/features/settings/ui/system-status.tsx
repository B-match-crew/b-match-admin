"use client";

import { useEffect, useCallback } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { useSettingsStore } from "../model/settings-store";
import { fetchSystemStatus } from "../api/settings-api";
import { formatNumber } from "@/src/shared/lib/format-number";
import { Users, Swords, Flag, HandCoins } from "lucide-react";

export function SystemStatus() {
  const supabase = useSupabase();
  const { systemStatus, setSystemStatus } = useSettingsStore();

  const loadStatus = useCallback(async () => {
    try {
      const status = await fetchSystemStatus(supabase);
      setSystemStatus(status);
    } catch (error) {
      console.error("시스템 상태 로딩 실패:", error);
    }
  }, [supabase, setSystemStatus]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  if (!systemStatus) return null;

  const cards = [
    {
      title: "전체 사용자",
      value: formatNumber(systemStatus.totalUsers),
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "활성 매칭",
      value: formatNumber(systemStatus.activeMatches),
      icon: Swords,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "미처리 신고",
      value: formatNumber(systemStatus.pendingReports),
      icon: Flag,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "대기 정산",
      value: formatNumber(systemStatus.pendingSettlements),
      icon: HandCoins,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">시스템 상태</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.title} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bgColor}`}
              >
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{card.title}</p>
                <p className="text-lg font-bold">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

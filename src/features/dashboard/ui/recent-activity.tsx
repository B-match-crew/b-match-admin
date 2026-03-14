"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { formatRelativeTime } from "@/src/shared/lib/format-date";
import { EmptyState } from "@/src/shared/ui/empty-state";

interface RecentItem {
  id: string;
  type: "user" | "matching" | "report";
  label: string;
  status: string;
  created_at: string;
}

export function RecentActivity() {
  const supabase = useSupabase();
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    async function fetchRecent() {
      const [usersRes, reportsRes] = await Promise.all([
        supabase
          .from("users")
          .select("id, nickname, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("reports")
          .select("id, reason, status, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const userItems: RecentItem[] = (usersRes.data ?? []).map((u) => ({
        id: u.id,
        type: "user",
        label: `${u.nickname} 님이 가입했습니다`,
        status: "신규 가입",
        created_at: u.created_at,
      }));

      const reportItems: RecentItem[] = (reportsRes.data ?? []).map((r) => ({
        id: r.id,
        type: "report",
        label: r.reason,
        status: r.status,
        created_at: r.created_at,
      }));

      const merged = [...userItems, ...reportItems]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        )
        .slice(0, 10);

      setItems(merged);
    }
    fetchRecent();
  }, [supabase]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">최근 활동</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState description="최근 활동 내역이 없습니다" />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm text-foreground">
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(item.created_at)}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

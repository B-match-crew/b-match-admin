"use client";

import { useEffect, useState } from "react";
import { adminFetchRecentActivity } from "@/src/app/actions/admin-actions";
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
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    adminFetchRecentActivity().then(setItems);
  }, []);

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

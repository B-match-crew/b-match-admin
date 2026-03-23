"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { formatRelativeTime } from "@/src/shared/lib/format-date";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { Flag } from "lucide-react";

interface ReportRow {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter: { nickname: string } | null;
}

export function RecentReportsWidget() {
  const supabase = useSupabase();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      const { data } = await supabase
        .from("reports")
        .select("id, reason, status, created_at, reporter:users!reports_reporter_id_fkey(nickname)")
        .order("created_at", { ascending: false })
        .limit(5);

      setReports((data as ReportRow[]) ?? []);
      setIsLoading(false);
    }
    fetchReports();
  }, [supabase]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Flag className="h-5 w-5 text-primary" />
          최근 신고
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <EmptyState description="최근 신고 내역이 없습니다" />
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm text-foreground">
                    {report.reason}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {report.reporter?.nickname ?? "알 수 없음"} &middot;{" "}
                    {formatRelativeTime(report.created_at)}
                  </p>
                </div>
                <StatusBadge status={report.status} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

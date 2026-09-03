"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { fetchReportStats } from "../../api/actions";
import { StatTile } from "../primitives";

export function ReportSection() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["stats-reports"],
    queryFn: () => unwrap(fetchReportStats()),
  });

  if (isError) {
    return (
      <QueryError
        section="신고 통계"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }
  const s = data?.summary;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-bds-heading3">신고 지표</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <StatTile
              label="미처리 신고"
              value={s?.pending ?? null}
              hint={s ? `전체 ${s.total}건` : undefined}
              loading={isLoading}
            />
            <StatTile
              label="신고율"
              value={s?.reportRate ?? null}
              suffix="%"
              hint="신고된 매칭 / 전체 매칭"
              loading={isLoading}
            />
            <StatTile
              label="처리 소요(중앙값)"
              value={s?.medianHoursToResolve ?? null}
              suffix="시간"
              loading={isLoading}
            />
            <StatTile
              label="조치 / 반려"
              value={s ? s.actioned : null}
              hint={s ? `반려 ${s.dismissed}건` : undefined}
              loading={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-bds-heading3">신고 많이 받은 호스트</CardTitle>
          <p className="text-bds-caption2 text-bds-label-alternative">
            서로 다른 신고자 수 우선. 상위 20명.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[160px] w-full" />
          ) : !data?.hosts.length ? (
            <EmptyState message="신고가 없습니다." />
          ) : (
            <table className="w-full text-bds-caption2">
              <thead>
                <tr className="border-b border-bds-border-alternative text-bds-label-assistive">
                  <th className="py-1.5 text-left font-normal">호스트</th>
                  <th className="py-1.5 text-left font-normal">상태</th>
                  <th className="py-1.5 text-right font-normal">신고자 수</th>
                  <th className="py-1.5 text-right font-normal">총 신고</th>
                </tr>
              </thead>
              <tbody>
                {data.hosts.map((h) => (
                  <tr
                    key={h.host_id}
                    className="border-b border-bds-border-alternative"
                  >
                    <td className="py-1.5">
                      <span className="text-foreground">
                        {h.nickname ?? h.name ?? `#${h.host_id}`}
                      </span>
                      <span className="ml-1.5 font-mono text-[11px] text-bds-label-assistive">
                        #{h.host_id}
                      </span>
                    </td>
                    <td className="py-1.5">
                      <StatusBadge status={h.user_status} />
                    </td>
                    <td className="py-1.5 text-right tabular-nums font-medium text-foreground">
                      {h.reporterCount}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-bds-label-alternative">
                      {h.reportCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

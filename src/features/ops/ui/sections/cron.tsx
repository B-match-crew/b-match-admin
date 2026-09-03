"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/shared/ui/kit/table";
import { Alert, AlertDescription } from "@/src/shared/ui/kit/alert";
import { Badge } from "@/src/shared/ui/kit/badge";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { WarningBox } from "@/src/shared/ui/warning-box";
import { unwrap } from "@/src/shared/lib/unwrap";
import { formatKst, formatRelativeTime } from "@/src/shared/lib/format-date";
import { fetchCronHealth } from "../../api/actions";
import { CronStatusBadge } from "../primitives";
import { JOB_IMPACT } from "../tokens";

export function CronSection() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["cron-health"],
    queryFn: () => unwrap(fetchCronHealth()),
  });

  if (isError) {
    return <QueryError section="크론 상태" error={error} onRetry={() => void refetch()} />;
  }

  const failed = (data ?? []).filter((j) => j.lastStatus === "failed");
  const neverRan = (data ?? []).filter((j) => j.active && j.lastStart === null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="size-4" />
          크론 상태
        </CardTitle>
        <CardDescription>
          잡별 <b>가장 최근 1회</b> 실행 결과입니다. 크론은 실패해도 아무 데도
          알리지 않으므로, 여기가 유일한 확인 경로입니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Skeleton className="h-48" />}

        {!isLoading && (data?.length ?? 0) === 0 && (
          <EmptyState
            message="크론 정보를 읽을 수 없습니다"
            description="pg_cron 이 설치되지 않았거나 이 환경에 잡이 없습니다."
          />
        )}

        {failed.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription>
              마지막 실행이 실패한 잡이 {failed.length}개 있습니다:{" "}
              <b>{failed.map((j) => j.jobname).join(", ")}</b>
            </AlertDescription>
          </Alert>
        )}
        {neverRan.length > 0 && (
          <WarningBox tone="caution">
            켜져 있지만 한 번도 실행된 기록이 없는 잡:{" "}
            <b>{neverRan.map((j) => j.jobname).join(", ")}</b>. 스케줄이 아직
            도래하지 않았거나, 등록만 되고 돌지 않는 상태입니다.
          </WarningBox>
        )}

        {!isLoading && (data?.length ?? 0) > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>잡</TableHead>
                <TableHead>스케줄</TableHead>
                <TableHead>마지막 실행</TableHead>
                <TableHead>결과</TableHead>
                <TableHead>메시지</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((j) => (
                <TableRow key={j.jobname} className={j.active ? undefined : "opacity-60"}>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs">{j.jobname}</span>
                      {!j.active && (
                        <Badge className="bg-bds-back-strong text-bds-label-neutral">
                          꺼짐
                        </Badge>
                      )}
                    </div>
                    {JOB_IMPACT[j.jobname] && (
                      <div className="text-bds-caption2 text-bds-label-alternative">
                        {JOB_IMPACT[j.jobname]}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {j.schedule}
                  </TableCell>
                  <TableCell className="text-sm">
                    {j.lastStart ? (
                      <>
                        <div>{formatKst(j.lastStart)}</div>
                        <div className="text-bds-caption2 text-bds-label-alternative">
                          {formatRelativeTime(j.lastStart)}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">기록 없음</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <CronStatusBadge status={j.lastStatus} />
                  </TableCell>
                  <TableCell className="max-w-sm break-words font-mono text-xs text-bds-status-error-text">
                    {j.lastMessage ?? ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

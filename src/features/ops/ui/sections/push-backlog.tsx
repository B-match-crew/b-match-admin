"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Alert, AlertDescription } from "@/src/shared/ui/kit/alert";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { formatNumber } from "@/src/shared/lib/format-number";
import { formatKst, formatRelativeTime } from "@/src/shared/lib/format-date";
import { fetchPushBacklog } from "../../api/actions";
import { Tile } from "../primitives";

/**
 * 맨 위에 두는 이유: 이 화면에서 **가장 빨리 썩는 것**이 발송이고, 크론 표는
 * "잡이 돌았는가" 만 답한다. 잡이 성공으로 찍혀도 Edge Function 이 거절하면
 * 알림은 안 나간다 — 그 경우는 여기서만 보인다.
 */
export function PushBacklogSection() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["push-backlog"],
    queryFn: () => unwrap(fetchPushBacklog()),
  });

  if (isError) {
    return (
      <QueryError
        section="푸시 발송 적체"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  const stale = data?.pendingStale ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="size-4" />
          푸시 발송 적체
        </CardTitle>
        <CardDescription>
          발송기는 5분마다 돕니다. 정상이면 PENDING 은 곧 사라집니다.{" "}
          <b>15분 넘게 남아 있으면</b> 크론·Vault 시크릿·Edge Function 중
          하나가 멈춘 것입니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Skeleton className="h-24" />}

        {!isLoading && data && (
          <>
            {stale > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="size-4" />
                <AlertDescription>
                  <b>{formatNumber(stale)}건</b>이 15분 넘게 발송되지 않았습니다.
                  아래 크론 표에서 <code>cron_dispatch_push</code> 를 먼저 보고,
                  성공으로 찍혀 있다면 Edge Function 로그를 확인하세요.
                </AlertDescription>
              </Alert>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <Tile label="대기 중" value={data.pendingTotal} />
              <Tile
                label="15분 초과"
                value={stale}
                tone={stale > 0 ? "danger" : undefined}
                hint={stale > 0 ? "발송이 멈춘 상태입니다" : "정상"}
              />
              <div className="rounded-lg border p-3">
                <div className="text-bds-caption2 text-bds-label-assistive">
                  가장 오래된 대기
                </div>
                <div className="mt-0.5 text-bds-title3 text-foreground">
                  {data.oldestPending ? formatRelativeTime(data.oldestPending) : "-"}
                </div>
                {data.oldestPending && (
                  <div className="text-bds-caption2 text-bds-label-alternative">
                    {formatKst(data.oldestPending)}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

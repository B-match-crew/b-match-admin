"use client";

import { useQuery } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/shared/ui/kit/table";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { InfoField, InfoGrid } from "@/src/shared/ui/info-field";
import { WarningBox } from "@/src/shared/ui/warning-box";
import { unwrap } from "@/src/shared/lib/unwrap";
import { formatNumber } from "@/src/shared/lib/format-number";
import { fetchPushReach } from "@/src/entities/notification";
import { Tile } from "../primitives";

export function ReachTab() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["push-reach"],
    queryFn: () => unwrap(fetchPushReach()),
  });

  if (isError) {
    return (
      <QueryError section="도달·토큰" error={error} onRetry={() => void refetch()} />
    );
  }
  if (isLoading || !data) return <Skeleton className="h-72" />;

  const gapAll = data.targetAll - data.reachableAll;
  const reachRate =
    data.targetAll > 0
      ? Math.round((data.reachableAll / data.targetAll) * 1000) / 10
      : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="size-4" />
            공지 도달 가능 수
          </CardTitle>
          <CardDescription>
            발송 대상 수와 실제로 푸시가 닿는 수는 다릅니다. 공지 발송 화면의
            미리보기는 <b>정회원 수</b>만 세며, 토큰이 없는 사람에게는 알림함
            행만 남고 푸시는 나가지 않습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="전체 대상" value={data.targetAll} />
            <Tile
              label="전체 도달 가능"
              value={data.reachableAll}
              tone={gapAll > 0 ? "warning" : undefined}
              hint={reachRate !== null ? `도달률 ${reachRate}%` : undefined}
            />
            <Tile label="모임장 대상" value={data.targetHost} />
            <Tile label="모임장 도달 가능" value={data.reachableHost} />
          </div>
          {gapAll > 0 && (
            <WarningBox tone="caution">
              {formatNumber(gapAll)}명은 유효한 푸시 토큰이 없어 <b>알림함에만</b>{" "}
              남습니다. 알림 권한을 끈 사용자, 앱을 지운 사용자가 여기 포함됩니다.
            </WarningBox>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>토큰 현황</CardTitle>
          <CardDescription>
            한 사람이 여러 기기를 쓸 수 있어 토큰 수와 사람 수는 다릅니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoGrid columns={3}>
            <InfoField label="전체 토큰">{formatNumber(data.tokensTotal)}</InfoField>
            <InfoField label="보유 사용자">{formatNumber(data.tokenUsers)}</InfoField>
            <InfoField label="30일 미사용 토큰">
              <span
                className={
                  data.staleTokens > 0 ? "text-bds-status-warning-text" : undefined
                }
              >
                {formatNumber(data.staleTokens)}
              </span>
            </InfoField>
          </InfoGrid>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OS</TableHead>
                <TableHead className="text-right">토큰</TableHead>
                <TableHead className="text-right">사용자</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byOs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>
                    <EmptyState message="등록된 토큰이 없습니다." />
                  </TableCell>
                </TableRow>
              )}
              {data.byOs.map((o) => (
                <TableRow key={o.os}>
                  <TableCell className="font-medium">{o.os}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(o.tokens)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatNumber(o.users)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

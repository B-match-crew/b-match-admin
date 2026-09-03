"use client";

import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/shared/ui/kit/table";
import { Alert, AlertDescription } from "@/src/shared/ui/kit/alert";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { WarningBox } from "@/src/shared/ui/warning-box";
import { unwrap } from "@/src/shared/lib/unwrap";
import { formatNumber } from "@/src/shared/lib/format-number";
import { fetchNotificationSummary } from "../../api/actions";
import { Tile } from "../primitives";
import { STATUS_LABEL } from "../tabs-tokens";

export function SummaryTab({ days }: { days: number }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["notification-summary", days],
    queryFn: () => unwrap(fetchNotificationSummary(days)),
  });

  if (isError) {
    return (
      <QueryError
        section="발송 현황"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }
  if (isLoading || !data) return <Skeleton className="h-96" />;

  const failed = data.byStatus.find((s) => s.status === "FAILED")?.cnt ?? 0;
  const skipped = data.byStatus.find((s) => s.status === "SKIPPED")?.cnt ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Tile label="발송 시도" value={data.total} />
        {["SENT", "FAILED", "SKIPPED", "PENDING"].map((s) => (
          <Tile
            key={s}
            label={STATUS_LABEL[s] ?? s}
            value={data.byStatus.find((x) => x.status === s)?.cnt ?? 0}
            tone={s === "FAILED" ? "danger" : s === "SKIPPED" ? "warning" : undefined}
          />
        ))}
      </div>

      {(data.byStatus.find((s) => s.status === "(기록없음)")?.cnt ?? 0) > 0 && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertDescription>
            발송 상태가 기록되지 않은 알림이{" "}
            {formatNumber(
              data.byStatus.find((s) => s.status === "(기록없음)")?.cnt ?? 0
            )}
            건 있습니다. 발송 상태 컬럼이 생기기 전(migration 43 이전)에 만들어진
            행이며, <b>성공으로 간주하지 않습니다</b>.
          </AlertDescription>
        </Alert>
      )}

      {failed > 0 && (
        <WarningBox tone="danger">
          기간 내 발송 실패 {formatNumber(failed)}건. 실패는 사용자에게 아무런
          표시 없이 지나갑니다 — <b>실패 내역</b> 탭에서 사유를 확인하세요.
        </WarningBox>
      )}
      {skipped > 0 && failed === 0 && (
        <WarningBox tone="caution">
          토큰이 없어 푸시가 나가지 않은 알림 {formatNumber(skipped)}건. 알림함에는
          남았지만 기기로는 도달하지 않았습니다(실패가 아니라 대상의 토큰 부재).
        </WarningBox>
      )}

      <Card>
        <CardHeader>
          <CardTitle>일자별 발송</CardTitle>
          <CardDescription>KST 기준. 성공/실패/토큰없음을 쌓아 보여줍니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.daily.length === 0 ? (
            <EmptyState message="기간 내 발송 기록이 없습니다." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.daily}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="sent" name="성공" stackId="a" fill="var(--color-series-1)" />
                <Bar dataKey="skipped" name="토큰없음" stackId="a" fill="var(--color-bds-status-warning)" />
                <Bar dataKey="failed" name="실패" stackId="a" fill="var(--color-bds-status-error)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>카테고리별</CardTitle>
          <CardDescription>
            발송 규칙(수신 동의·야간 차단)은 카테고리로 갈립니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>카테고리</TableHead>
                <TableHead className="text-right">합계</TableHead>
                <TableHead className="text-right">성공</TableHead>
                <TableHead className="text-right">실패</TableHead>
                <TableHead className="text-right">토큰없음</TableHead>
                <TableHead className="text-right">대기</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byCategory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState message="기간 내 발송 기록이 없습니다." />
                  </TableCell>
                </TableRow>
              )}
              {data.byCategory.map((c) => (
                <TableRow key={c.category}>
                  <TableCell>
                    <span className="font-medium">{c.label ?? c.category}</span>
                    <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                      {c.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(c.total)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(c.sent)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.failed > 0 ? (
                      <span className="font-medium text-bds-status-error-text">
                        {formatNumber(c.failed)}
                      </span>
                    ) : (
                      0
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatNumber(c.skipped)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatNumber(c.pending)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data.failReasons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>실패 사유 상위</CardTitle>
            <CardDescription>
              FCM 이 돌려준 원문입니다. `NotRegistered` / `InvalidRegistration` 이
              많으면 죽은 토큰이 쌓인 것입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>사유</TableHead>
                  <TableHead className="text-right">건수</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.failReasons.map((f) => (
                  <TableRow key={f.reason}>
                    <TableCell className="font-mono text-xs">{f.reason}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(f.cnt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

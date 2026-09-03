"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Radio } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/shared/ui/kit/table";
import { Alert, AlertDescription } from "@/src/shared/ui/kit/alert";
import { Badge } from "@/src/shared/ui/kit/badge";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { SegmentedTab } from "@/src/shared/ui/bds/segmented-tab";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { formatNumber } from "@/src/shared/lib/format-number";
import { formatKst } from "@/src/shared/lib/format-date";
import { fetchEventNames } from "../../api/actions";
import { TRACKED_EVENTS } from "../../model/constants";
import { RANGES } from "../tokens";

export function EventSection({
  days,
  range,
  onRangeChange,
}: {
  days: number;
  range: "7" | "30" | "90";
  onRangeChange: (v: "7" | "30" | "90") => void;
}) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["event-names", days],
    queryFn: () => unwrap(fetchEventNames(days)),
  });

  if (isError) {
    return (
      <QueryError section="수집 이벤트" error={error} onRetry={() => void refetch()} />
    );
  }

  const seen = new Set((data ?? []).map((e) => e.eventName));
  const missing = TRACKED_EVENTS.filter((e) => !seen.has(e));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Radio className="size-4" />
              수집 이벤트
            </CardTitle>
            <CardDescription>
              분석 페이지의 퍼널 집계는 <b>이벤트 이름을 문자열로</b> 찾습니다.
              앱이 이름을 바꾸면 오류 없이 그 단계가 0 이 됩니다.
            </CardDescription>
          </div>
          <div className="w-48">
            <SegmentedTab
              items={RANGES}
              value={range}
              onValueChange={onRangeChange}
              size="sm"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Skeleton className="h-48" />}

        {!isLoading && missing.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription>
              분석 집계가 찾는 이름 중 기간 내에 <b>한 건도 들어오지 않은</b>{" "}
              것이 있습니다: <b>{missing.join(", ")}</b>. 앱이 이름을 바꿨다면
              해당 퍼널 단계는 지금 0 으로 계산되고 있습니다.
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && (data?.length ?? 0) === 0 ? (
          <EmptyState message="기간 내 수집된 이벤트가 없습니다." />
        ) : (
          !isLoading && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이벤트</TableHead>
                  <TableHead className="text-right">건수</TableHead>
                  <TableHead className="text-right">회원</TableHead>
                  <TableHead className="text-right">기기</TableHead>
                  <TableHead>마지막 수집</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.map((e) => {
                  const tracked = (TRACKED_EVENTS as readonly string[]).includes(
                    e.eventName
                  );
                  return (
                    <TableRow key={e.eventName}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs">{e.eventName}</span>
                          {tracked && (
                            <Badge className="bg-bds-status-info-subtle text-bds-status-info-text">
                              집계 사용
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(e.cnt)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatNumber(e.users)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatNumber(e.devices)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatKst(e.lastSeen)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )
        )}
      </CardContent>
    </Card>
  );
}

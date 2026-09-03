"use client";

import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/shared/ui/kit/table";
import { Badge } from "@/src/shared/ui/kit/badge";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { fetchRecentFailures } from "../../api/actions";
import { SkeletonRows } from "../primitives";

export function FailuresTab() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["notification-failures"],
    queryFn: () => unwrap(fetchRecentFailures(50)),
  });

  if (isError) {
    return (
      <QueryError
        section="실패 내역"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-bds-caption2 text-bds-label-alternative">
        최근 실패 50건. 발송 실패는 사용자에게도 관리자에게도 아무 표시가 없으므로
        사유(fail_reason)가 유일한 단서입니다.
      </p>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>수신자</TableHead>
              <TableHead>카테고리</TableHead>
              <TableHead>제목</TableHead>
              <TableHead>실패 사유</TableHead>
              <TableHead>발생 시각</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <SkeletonRows cols={6} />}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState message="발송 실패가 없습니다." />
                </TableCell>
              </TableRow>
            )}
            {data?.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-mono text-xs">#{f.id}</TableCell>
                <TableCell>
                  <span className="font-medium">
                    {f.nickname ?? f.name ?? `#${f.userId}`}
                  </span>
                  <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                    #{f.userId}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge className="bg-bds-back-strong text-bds-label-neutral">
                    {f.category ?? "(없음)"}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-xs truncate text-sm">
                  {f.title ?? "-"}
                </TableCell>
                <TableCell className="font-mono text-xs text-bds-status-error-text">
                  {f.failReason ?? "(사유없음)"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(f.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

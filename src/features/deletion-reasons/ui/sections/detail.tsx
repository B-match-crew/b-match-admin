"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { MessageSquareQuote, ShieldOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/shared/ui/kit/table";
import { Badge } from "@/src/shared/ui/kit/badge";
import { Button } from "@/src/shared/ui/kit/button";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { formatKst } from "@/src/shared/lib/format-date";
import { fetchDeletionReasonDetails } from "../../api/actions";
import { DELETION_REASON_LABEL } from "../../model/constants";
import { PAGE_SIZE } from "../tokens";

export function DetailSection() {
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["deletion-reason-details", page],
    queryFn: () =>
      unwrap(
        fetchDeletionReasonDetails({
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        })
      ),
    placeholderData: keepPreviousData,
  });

  if (isError) {
    return (
      <QueryError
        section="자유입력"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  const rows = data ?? [];
  // 서버는 총 개수를 주지 않는다(익명 통계라 굳이 필요 없다). 한 페이지가 꽉
  // 찼으면 다음이 있다고 본다 — 마지막 페이지가 정확히 꽉 차면 빈 페이지를
  // 한 번 볼 수 있는데, 그 값에 비해 count 쿼리를 더 도는 편이 비싸다.
  const hasNext = rows.length === PAGE_SIZE;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquareQuote className="size-4" />
          자유입력
        </CardTitle>
        <CardDescription>
          사용자가 직접 적은 내용입니다. 최신순이며 <b>식별 정보가 없습니다</b>{" "}
          — 여기서 특정 사용자를 찾아갈 수는 없습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Skeleton className="h-48" />}

        {!isLoading && rows.length === 0 && (
          <EmptyState
            message={
              page === 0
                ? "남겨진 내용이 없습니다"
                : "이 페이지에는 더 이상 없습니다"
            }
          />
        )}

        {!isLoading && rows.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">탈퇴 시각</TableHead>
                <TableHead className="w-24">유형</TableHead>
                <TableHead className="w-64">고른 사유</TableHead>
                <TableHead>직접 입력</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatKst(r.createdAt)}
                  </TableCell>
                  <TableCell>
                    {r.wasHost ? (
                      <Badge className="bg-bds-status-warning-subtle text-bds-status-warning-text">
                        <ShieldOff className="mr-1 size-3" />
                        모임장
                      </Badge>
                    ) : (
                      <Badge className="bg-bds-back-strong text-bds-label-neutral">
                        일반
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="space-x-1 space-y-1">
                    {r.reasonCodes && r.reasonCodes.length > 0 ? (
                      r.reasonCodes.map((c) => (
                        <Badge
                          key={c}
                          className="bg-bds-status-info-subtle text-bds-status-info-text"
                        >
                          {DELETION_REASON_LABEL[c] ?? c}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-bds-caption2 text-bds-label-alternative">
                        구버전 앱 (코드 없음)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-md break-words text-sm">
                    {r.detail ?? (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {(page > 0 || hasNext) && (
          <div className="flex items-center justify-end gap-2">
            <span className="text-bds-caption2 text-bds-label-alternative">
              {page + 1} 페이지
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0 || isFetching}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              이전
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext || isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              다음
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

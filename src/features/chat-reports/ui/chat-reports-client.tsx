"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/shared/ui/kit/table";
import { Button } from "@/src/shared/ui/kit/button";
import { Badge } from "@/src/shared/ui/kit/badge";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/shared/ui/kit/select";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import type { ReportStatus } from "@/src/shared/types/db";
import { fetchChatReports } from "../api/actions";
import type { ChatReportListItem } from "../model/actions";
import { ChatReportDetailDialog } from "./chat-report-detail-dialog";

export function ChatReportsClient() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ReportStatus | "ALL">("PENDING");
  const [detail, setDetail] = useState<ChatReportListItem | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["chat-reports", status],
    queryFn: () => unwrap(fetchChatReports({ status, limit: 100 })),
  });

  const refetch = () =>
    queryClient.invalidateQueries({ queryKey: ["chat-reports"] });

  // 상세 모달이 열린 상태에서 목록이 갱신되면 최신 행으로 동기화
  const liveDetail = useMemo(() => {
    if (!detail) return null;
    return data?.find((r) => r.id === detail.id) ?? detail;
  }, [detail, data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as ReportStatus | "ALL")}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">미처리</SelectItem>
            <SelectItem value="REVIEWED">검토중</SelectItem>
            <SelectItem value="ACTIONED">조치완료</SelectItem>
            <SelectItem value="DISMISSED">반려</SelectItem>
            <SelectItem value="ALL">전체</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={refetch}>
          새로고침
        </Button>
      </div>

      {isError && (
        <QueryError section="채팅 신고 목록" error={error} onRetry={refetch} />
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[70px]">ID</TableHead>
              <TableHead>피신고자</TableHead>
              <TableHead>신고 사유</TableHead>
              <TableHead>신고자</TableHead>
              <TableHead>보존 대화</TableHead>
              <TableHead>접수일</TableHead>
              <TableHead>처리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState message="해당 상태의 채팅 신고가 없습니다." />
                </TableCell>
              </TableRow>
            )}
            {data?.map((r) => (
              <TableRow
                key={r.id}
                className="cursor-pointer"
                onClick={() => setDetail(r)}
              >
                <TableCell className="font-mono text-xs">#{r.id}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {r.target?.nickname ?? r.target?.name ?? `#${r.target_id}`}
                    </span>
                    {r.target && r.target.user_status !== "ACTIVE" && (
                      <StatusBadge status={r.target.user_status} />
                    )}
                    {r.targetReportCount > 1 && (
                      <Badge
                        variant="outline"
                        className="border-bds-status-warning/40 bg-bds-status-warning-subtle text-bds-status-warning-text"
                      >
                        신고 {r.targetReportCount}건
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="max-w-[180px]">
                  <span className="text-sm">{r.reason}</span>
                  {r.detail && (
                    <p className="truncate text-xs text-muted-foreground">
                      {r.detail}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {r.reporter?.nickname ??
                    r.reporter?.name ??
                    `#${r.reporter_id}`}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.snapshot.length}건
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(r.created_at)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ChatReportDetailDialog
        report={liveDetail}
        onClose={() => setDetail(null)}
        onChanged={refetch}
      />
    </div>
  );
}

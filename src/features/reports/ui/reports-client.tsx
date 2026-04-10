"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { formatDateTime } from "@/src/shared/lib/format-date";
import {
  fetchPendingReports,
  fetchReportHistory,
  type ReportRow,
} from "@/src/features/reports/actions";
import { ReportDetailDialog } from "./report-detail-dialog";

export function ReportsClient() {
  return (
    <Tabs defaultValue="pending">
      <TabsList>
        <TabsTrigger value="pending">처리 대기</TabsTrigger>
        <TabsTrigger value="history">처리 이력</TabsTrigger>
      </TabsList>
      <TabsContent value="pending" className="mt-4">
        <PendingReportsTab />
      </TabsContent>
      <TabsContent value="history" className="mt-4">
        <ReportHistoryTab />
      </TabsContent>
    </Tabs>
  );
}

// ─── 처리 대기 탭 ───

function PendingReportsTab() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ReportRow | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["reports", "pending"],
    queryFn: fetchPendingReports,
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["reports"] });
  };

  if (isError) {
    return (
      <p className="text-sm text-destructive">신고 목록을 불러오지 못했습니다.</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          처리 대기 신고 {data?.length ?? 0}건
        </p>
        <Button variant="outline" size="sm" onClick={refetch}>
          새로고침
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>대상</TableHead>
              <TableHead>신고자</TableHead>
              <TableHead>누적</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>접수 시각</TableHead>
              <TableHead className="text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeletonRows cols={7} />}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState message="처리 대기 중인 신고가 없습니다." />
                </TableCell>
              </TableRow>
            )}
            {data?.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">#{r.id}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.target_type} />
                    <span className="font-mono text-xs">#{r.target_id}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {r.reporter?.nickname ?? r.reporter?.name ?? (
                    <span className="text-muted-foreground">알 수 없음</span>
                  )}
                </TableCell>
                <TableCell>
                  {r.cumulative_count >= 3 ? (
                    <Badge className="bg-red-100 text-red-700 border-red-200">
                      {r.cumulative_count}건
                    </Badge>
                  ) : (
                    <Badge variant="outline">{r.cumulative_count}건</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(r.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelected(r)}
                  >
                    검토
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ReportDetailDialog
        report={selected}
        onClose={() => setSelected(null)}
        onResolved={() => {
          setSelected(null);
          toast.success("처리되었습니다");
          refetch();
        }}
      />
    </div>
  );
}

// ─── 처리 이력 탭 ───

function ReportHistoryTab() {
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "RESOLVED" | "REJECTED"
  >("ALL");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["reports", "history", statusFilter, page],
    queryFn: () =>
      fetchReportHistory({
        status: statusFilter,
        limit: pageSize,
        offset: page * pageSize,
      }),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as "ALL" | "RESOLVED" | "REJECTED");
            setPage(0);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체</SelectItem>
            <SelectItem value="RESOLVED">처리완료</SelectItem>
            <SelectItem value="REJECTED">반려</SelectItem>
          </SelectContent>
        </Select>
        <p className="ml-auto text-sm text-muted-foreground">
          총 {data?.total ?? 0}건
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>대상</TableHead>
              <TableHead>신고자</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>접수 시각</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeletonRows cols={5} />}
            {!isLoading && (data?.rows.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState message="처리 이력이 없습니다." />
                </TableCell>
              </TableRow>
            )}
            {data?.rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">#{r.id}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.target_type} />
                    <span className="font-mono text-xs">#{r.target_id}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {r.reporter?.nickname ?? r.reporter?.name ?? (
                    <span className="text-muted-foreground">알 수 없음</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(r.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            이전
          </Button>
          <span className="text-sm text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── 공통 Skeleton 행 ───

function TableSkeletonRows({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

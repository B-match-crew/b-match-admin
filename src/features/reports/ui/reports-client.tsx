"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { formatDateTime } from "@/src/shared/lib/format-date";
import {
  fetchPendingReports,
  type ReportRow,
} from "@/src/features/reports/actions";
import { ReportDetailDialog } from "./report-detail-dialog";

export function ReportsClient() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ReportRow | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["reports", "pending"],
    queryFn: fetchPendingReports,
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["reports", "pending"] });
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
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  불러오는 중...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  처리 대기 중인 신고가 없습니다.
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

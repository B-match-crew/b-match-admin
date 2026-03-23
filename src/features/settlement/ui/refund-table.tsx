"use client";

import { useEffect, useCallback } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { useAuth } from "@/src/app/providers/auth-provider";
import { useSettlementStore } from "../model/settlement-store";
import { fetchRefunds, retryRefund } from "../api/settlement-api";
import type { SettlementStatus } from "@/src/entities/settlement/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { LoadingSpinner } from "@/src/shared/ui/loading-spinner";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { formatCurrency } from "@/src/shared/lib/format-number";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";

const ITEMS_PER_PAGE = 20;

export function RefundTable() {
  const supabase = useSupabase();
  const { user } = useAuth();
  const {
    refunds,
    isLoading,
    totalCount,
    page,
    statusFilter,
    setRefunds,
    setLoading,
    setStatusFilter,
    setPage,
  } = useSettlementStore();

  const loadRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchRefunds(supabase, {
        status: statusFilter,
        page,
        limit: ITEMS_PER_PAGE,
      });
      setRefunds(result.refunds, result.totalCount);
    } catch (error) {
      console.error("환불 목록 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, statusFilter, page, setRefunds, setLoading]);

  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

  const handleRetry = async (refundId: string) => {
    if (!user?.id) return;
    try {
      await retryRefund(supabase, refundId, user.id);
      toast.success("환불 재시도가 요청되었습니다");
      loadRefunds();
    } catch (error) {
      console.error("환불 재시도 실패:", error);
      toast.error("환불 재시도에 실패했습니다");
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            setStatusFilter(v as "all" | SettlementStatus)
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="PENDING">대기</SelectItem>
            <SelectItem value="COMPLETED">완료</SelectItem>
            <SelectItem value="FAILED">실패</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : refunds.length === 0 ? (
        <EmptyState
          title="환불 내역이 없습니다"
          description="처리된 환불 내역이 없습니다"
        />
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>요청일시</TableHead>
                  <TableHead>게스트</TableHead>
                  <TableHead>매칭</TableHead>
                  <TableHead>사유</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>완료일시</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refunds.map((r) => (
                  <TableRow
                    key={r.id}
                    className={r.status === "FAILED" ? "bg-red-50" : ""}
                  >
                    <TableCell>{formatDateTime(r.created_at)}</TableCell>
                    <TableCell>{r.guest?.nickname ?? "-"}</TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {r.match?.title ?? `#${r.match_id}`}
                    </TableCell>
                    <TableCell>{r.reason}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(r.amount)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell>
                      {r.completed_at ? formatDateTime(r.completed_at) : "-"}
                    </TableCell>
                    <TableCell>
                      {r.status === "FAILED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(r.id)}
                        >
                          <RotateCcw className="mr-1 h-3 w-3" />
                          재시도
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              총 {totalCount}건 중 {(page - 1) * ITEMS_PER_PAGE + 1}-
              {Math.min(page * ITEMS_PER_PAGE, totalCount)}건
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                이전
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
              >
                다음
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

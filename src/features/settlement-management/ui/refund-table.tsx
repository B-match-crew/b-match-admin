"use client";

import { useEffect, useCallback } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { useAuth } from "@/src/app/providers/auth-provider";
import { useSettlementStore } from "../model/settlement-store";
import {
  fetchRefunds,
  markRefundsExported,
  completeRefund,
  failRefund,
  generateRefundTSV,
} from "../api/settlement-api";
import { canWriteFinance } from "@/src/shared/lib/role-guard";
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
import { Input } from "@/components/ui/input";
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
import { formatDate } from "@/src/shared/lib/format-date";
import { formatCurrency } from "@/src/shared/lib/format-number";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  CheckCircle,
  XCircle,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";

const ITEMS_PER_PAGE = 20;

export function RefundTable() {
  const supabase = useSupabase();
  const { role } = useAuth();
  const canWrite = canWriteFinance(role);

  const {
    refunds,
    isLoading,
    refundTotalCount,
    refundPage,
    refundStatusFilter,
    selectedRefundIds,
    setRefunds,
    setLoading,
    setRefundStatusFilter,
    setRefundPage,
    toggleRefundSelection,
    selectAllRefunds,
    clearRefundSelection,
  } = useSettlementStore();

  const loadRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchRefunds(supabase, {
        status: refundStatusFilter,
        page: refundPage,
        limit: ITEMS_PER_PAGE,
      });
      setRefunds(result.refunds, result.totalCount);
    } catch (error) {
      console.error("환불 목록 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, refundStatusFilter, refundPage, setRefunds, setLoading]);

  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

  const totalPages = Math.ceil(refundTotalCount / ITEMS_PER_PAGE);

  const pendingRefunds = refunds.filter((r) => r.status === "PENDING");
  const allPendingSelected =
    pendingRefunds.length > 0 &&
    pendingRefunds.every((r) => selectedRefundIds.includes(r.id));

  const handleSelectAll = () => {
    if (allPendingSelected) {
      clearRefundSelection();
    } else {
      selectAllRefunds(pendingRefunds.map((r) => r.id));
    }
  };

  const handleCopyTSV = async () => {
    const selected = refunds.filter((r) => selectedRefundIds.includes(r.id));
    if (selected.length === 0) {
      toast.error("내보낼 항목을 선택해 주세요");
      return;
    }
    const tsv = generateRefundTSV(selected);
    await navigator.clipboard.writeText(tsv);
    toast.success(`${selected.length}건 TSV 클립보드에 복사됨`);
  };

  const handleExport = async () => {
    if (!canWrite) return;
    const selected = refunds.filter(
      (r) => selectedRefundIds.includes(r.id) && r.status === "PENDING"
    );
    if (selected.length === 0) {
      toast.error("PENDING 상태 항목만 내보내기 가능합니다");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tsv = generateRefundTSV(selected);
      await navigator.clipboard.writeText(tsv);

      await markRefundsExported(
        supabase,
        selected.map((r) => r.id),
        user.id
      );

      toast.success(`${selected.length}건 내보내기 완료 (TSV 복사됨)`);
      clearRefundSelection();
      loadRefunds();
    } catch (error) {
      toast.error("내보내기 실패");
      console.error(error);
    }
  };

  const handleComplete = async (id: number) => {
    if (!canWrite) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await completeRefund(supabase, id, user.id);
      toast.success("환불 완료 처리됨");
      loadRefunds();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "완료 처리 실패";
      toast.error(msg);
    }
  };

  const handleFail = async (id: number) => {
    if (!canWrite) return;
    const reason = prompt("실패 사유를 입력해 주세요");
    if (!reason) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await failRefund(supabase, id, user.id, reason);
      toast.success("환불 실패 처리됨");
      loadRefunds();
    } catch (error) {
      toast.error("실패 처리 실패");
      console.error(error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select
          value={refundStatusFilter}
          onValueChange={(value) =>
            setRefundStatusFilter(value as "all" | SettlementStatus)
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="PENDING">대기</SelectItem>
            <SelectItem value="EXPORTED">내보내기</SelectItem>
            <SelectItem value="COMPLETED">완료</SelectItem>
            <SelectItem value="FAILED">실패</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          {selectedRefundIds.length > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedRefundIds.length}건 선택
              </span>
              <Button variant="outline" size="sm" onClick={handleCopyTSV}>
                <Copy className="h-4 w-4 mr-1" />
                TSV 복사
              </Button>
              <Button
                size="sm"
                onClick={handleExport}
                disabled={!canWrite}
                title={!canWrite ? "SUPER_ADMIN만 내보내기 가능합니다" : ""}
              >
                <Download className="h-4 w-4 mr-1" />
                내보내기
              </Button>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : refunds.length === 0 ? (
        <EmptyState title="환불 요청 없음" description="환불 요청이 없습니다" />
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={allPendingSelected}
                      onChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>게스트</TableHead>
                  <TableHead>모임</TableHead>
                  <TableHead>환불 사유</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>요청일</TableHead>
                  {canWrite && <TableHead>액션</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {refunds.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.status === "PENDING" && (
                        <Input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={selectedRefundIds.includes(item.id)}
                          onChange={() => toggleRefundSelection(item.id)}
                        />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.guest?.nickname ?? "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.match?.title ?? `매칭 #${item.match_id}`}
                    </TableCell>
                    <TableCell className="max-w-[200px] text-sm truncate">
                      {item.reason}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.amount)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell>{formatDate(item.created_at)}</TableCell>
                    {canWrite && (
                      <TableCell>
                        {item.status === "EXPORTED" && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleComplete(item.id)}
                              title="완료"
                            >
                              <CheckCircle className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFail(item.id)}
                              title="실패"
                            >
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              총 {refundTotalCount}건
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRefundPage(refundPage - 1)}
                disabled={refundPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                이전
              </Button>
              <span className="text-sm text-muted-foreground">
                {refundPage} / {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRefundPage(refundPage + 1)}
                disabled={refundPage >= totalPages}
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

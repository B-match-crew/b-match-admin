"use client";

import { useEffect, useCallback } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { useAuth } from "@/src/app/providers/auth-provider";
import { useSettlementStore } from "../model/settlement-store";
import {
  fetchSettlements,
  markSettlementsExported,
  completeSettlement,
  failSettlement,
  generateSettlementTSV,
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

export function SettlementTable() {
  const supabase = useSupabase();
  const { role } = useAuth();
  const canWrite = canWriteFinance(role);

  const {
    settlements,
    isLoading,
    settlementTotalCount,
    settlementPage,
    settlementStatusFilter,
    selectedSettlementIds,
    setSettlements,
    setLoading,
    setSettlementStatusFilter,
    setSettlementPage,
    toggleSettlementSelection,
    selectAllSettlements,
    clearSettlementSelection,
  } = useSettlementStore();

  const loadSettlements = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchSettlements(supabase, {
        status: settlementStatusFilter,
        page: settlementPage,
        limit: ITEMS_PER_PAGE,
      });
      setSettlements(result.settlements, result.totalCount);
    } catch (error) {
      console.error("정산 목록 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, settlementStatusFilter, settlementPage, setSettlements, setLoading]);

  useEffect(() => {
    loadSettlements();
  }, [loadSettlements]);

  const totalPages = Math.ceil(settlementTotalCount / ITEMS_PER_PAGE);

  const pendingSettlements = settlements.filter((s) => s.status === "PENDING");
  const allPendingSelected =
    pendingSettlements.length > 0 &&
    pendingSettlements.every((s) => selectedSettlementIds.includes(s.id));

  const handleSelectAll = () => {
    if (allPendingSelected) {
      clearSettlementSelection();
    } else {
      selectAllSettlements(pendingSettlements.map((s) => s.id));
    }
  };

  const handleCopyTSV = async () => {
    const selected = settlements.filter((s) => selectedSettlementIds.includes(s.id));
    if (selected.length === 0) {
      toast.error("내보낼 항목을 선택해 주세요");
      return;
    }
    const tsv = generateSettlementTSV(selected);
    await navigator.clipboard.writeText(tsv);
    toast.success(`${selected.length}건 TSV 클립보드에 복사됨`);
  };

  const handleExport = async () => {
    if (!canWrite) return;
    const selected = settlements.filter(
      (s) => selectedSettlementIds.includes(s.id) && s.status === "PENDING"
    );
    if (selected.length === 0) {
      toast.error("PENDING 상태 항목만 내보내기 가능합니다");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tsv = generateSettlementTSV(selected);
      await navigator.clipboard.writeText(tsv);

      await markSettlementsExported(
        supabase,
        selected.map((s) => s.id),
        user.id
      );

      toast.success(`${selected.length}건 내보내기 완료 (TSV 복사됨)`);
      clearSettlementSelection();
      loadSettlements();
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
      await completeSettlement(supabase, id, user.id);
      toast.success("정산 완료 처리됨");
      loadSettlements();
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
      await failSettlement(supabase, id, user.id, reason);
      toast.success("정산 실패 처리됨");
      loadSettlements();
    } catch (error) {
      toast.error("실패 처리 실패");
      console.error(error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select
          value={settlementStatusFilter}
          onValueChange={(value) =>
            setSettlementStatusFilter(value as "all" | SettlementStatus)
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
          {selectedSettlementIds.length > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedSettlementIds.length}건 선택
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
      ) : settlements.length === 0 ? (
        <EmptyState title="정산 요청 없음" description="정산 요청이 없습니다" />
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
                  <TableHead>호스트</TableHead>
                  <TableHead>은행/계좌</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>요청일</TableHead>
                  {canWrite && <TableHead>액션</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.status === "PENDING" && (
                        <Input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={selectedSettlementIds.includes(item.id)}
                          onChange={() => toggleSettlementSelection(item.id)}
                        />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.host?.nickname ?? "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{item.bank_info.bank_name}</div>
                      <div className="text-muted-foreground text-xs">
                        {item.bank_info.account_no} / {item.bank_info.holder_name}
                      </div>
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
              총 {settlementTotalCount}건
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSettlementPage(settlementPage - 1)}
                disabled={settlementPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                이전
              </Button>
              <span className="text-sm text-muted-foreground">
                {settlementPage} / {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSettlementPage(settlementPage + 1)}
                disabled={settlementPage >= totalPages}
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

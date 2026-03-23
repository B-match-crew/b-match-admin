"use client";

import { useEffect, useCallback } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { useSettlementStore } from "../model/settlement-store";
import { fetchSettlements } from "../api/settlement-api";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { ChevronLeft, ChevronRight } from "lucide-react";

const ITEMS_PER_PAGE = 20;

export function SettlementTable() {
  const supabase = useSupabase();
  const {
    settlements,
    isLoading,
    totalCount,
    page,
    statusFilter,
    selectedIds,
    setSettlements,
    setLoading,
    setStatusFilter,
    setPage,
    toggleSelect,
    selectAll,
    clearSelection,
  } = useSettlementStore();

  const loadSettlements = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchSettlements(supabase, {
        status: statusFilter,
        page,
        limit: ITEMS_PER_PAGE,
      });
      setSettlements(result.settlements, result.totalCount);
    } catch (error) {
      console.error("정산 목록 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, statusFilter, page, setSettlements, setLoading]);

  useEffect(() => {
    loadSettlements();
  }, [loadSettlements]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const selectableIds = settlements
    .filter((s) => s.status === "PENDING" || s.status === "EXPORTED")
    .map((s) => s.id);

  const allSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selectedIds.includes(id));

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
            <SelectItem value="EXPORTED">내보내기</SelectItem>
            <SelectItem value="COMPLETED">완료</SelectItem>
            <SelectItem value="FAILED">실패</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : settlements.length === 0 ? (
        <EmptyState
          title="정산 요청이 없습니다"
          description="호스트의 출금 요청이 없습니다"
        />
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(checked) =>
                        checked ? selectAll(selectableIds) : clearSelection()
                      }
                    />
                  </TableHead>
                  <TableHead>요청일시</TableHead>
                  <TableHead>닉네임</TableHead>
                  <TableHead>예금주</TableHead>
                  <TableHead>은행</TableHead>
                  <TableHead>계좌번호</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.map((s) => {
                  const isSelectable =
                    s.status === "PENDING" || s.status === "EXPORTED";
                  return (
                    <TableRow
                      key={s.id}
                      className={
                        s.status === "EXPORTED"
                          ? "bg-yellow-50"
                          : s.status === "FAILED"
                            ? "bg-red-50"
                            : ""
                      }
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(s.id)}
                          onCheckedChange={() => toggleSelect(s.id)}
                          disabled={!isSelectable}
                        />
                      </TableCell>
                      <TableCell>{formatDateTime(s.created_at)}</TableCell>
                      <TableCell>{s.host?.nickname ?? "-"}</TableCell>
                      <TableCell className="font-medium">
                        {s.bank_info.holder_name}
                      </TableCell>
                      <TableCell>{s.bank_info.bank_name}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {s.bank_info.account_no}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(s.amount)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={s.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
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

"use client";

import { useEffect, useCallback } from "react";
import { useAuditStore } from "../model/audit-store";
import {
  ACTION_LABELS,
  TARGET_TYPE_LABELS,
} from "../api/audit-api";
import { adminFetchAuditLogs } from "@/src/app/actions/admin-read-actions";
import type { AuditAction, AuditLog, AuditTargetType } from "@/src/entities/audit/types";
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
import { LoadingSpinner } from "@/src/shared/ui/loading-spinner";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";

const ITEMS_PER_PAGE = 20;

const actionTypeOptions: { value: "all" | AuditAction; label: string }[] = [
  { value: "all", label: "전체 행위" },
  { value: "BAN_USER", label: "유저 차단" },
  { value: "SUSPEND_USER", label: "유저 정지" },
  { value: "FORCE_CANCEL_MATCH", label: "매칭 강제 취소" },
  { value: "ADJUST_BADTICKET", label: "배티켓 조정" },
  { value: "APPROVE_SETTLEMENT", label: "정산 승인" },
  { value: "APPROVE_REFUND", label: "환불 승인" },
  { value: "FAIL_SETTLEMENT", label: "정산 실패" },
  { value: "FAIL_REFUND", label: "환불 실패" },
  { value: "RELEASE_HOLD", label: "동결 해제" },
  { value: "DEDUCT_HOLD", label: "동결금 차감" },
];

const targetTypeOptions: { value: "all" | AuditTargetType; label: string }[] = [
  { value: "all", label: "전체 대상" },
  { value: "USER", label: "유저" },
  { value: "MATCH", label: "매칭" },
  { value: "SETTLEMENT", label: "정산" },
  { value: "REFUND", label: "환불" },
];

export function AuditTable() {
  const {
    logs,
    isLoading,
    totalCount,
    page,
    actionFilter,
    targetFilter,
    setLogs,
    setLoading,
    setActionFilter,
    setTargetFilter,
    setPage,
    setSelectedLog,
  } = useAuditStore();

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminFetchAuditLogs({
        actionType: actionFilter,
        targetType: targetFilter,
        page,
        limit: ITEMS_PER_PAGE,
      });
      setLogs(result.logs as AuditLog[], result.totalCount);
    } catch (error) {
      console.error("감사 로그 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, targetFilter, page, setLogs, setLoading]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const getActionColor = (action: string) => {
    if (action.includes("BAN") || action.includes("SUSPEND"))
      return "bg-red-50 text-red-700 border-red-200";
    if (action.includes("FAIL"))
      return "bg-orange-50 text-orange-700 border-orange-200";
    if (action.includes("APPROVE") || action.includes("RELEASE"))
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Select
          value={actionFilter}
          onValueChange={(v) => setActionFilter(v as "all" | AuditAction)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="행위 유형" />
          </SelectTrigger>
          <SelectContent>
            {actionTypeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={targetFilter}
          onValueChange={(v) =>
            setTargetFilter(v as "all" | AuditTargetType)
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="대상 유형" />
          </SelectTrigger>
          <SelectContent>
            {targetTypeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : logs.length === 0 ? (
        <EmptyState
          title="감사 로그가 없습니다"
          description="관리자 행위 이력이 없습니다"
        />
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>일시</TableHead>
                  <TableHead>관리자</TableHead>
                  <TableHead>행위</TableHead>
                  <TableHead>대상</TableHead>
                  <TableHead>대상 ID</TableHead>
                  <TableHead>사유</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </TableCell>
                    <TableCell>
                      {log.admin?.email ?? log.admin_id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getActionColor(log.action_type)}
                      >
                        {ACTION_LABELS[log.action_type as AuditAction] ?? log.action_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {TARGET_TYPE_LABELS[log.target_type as AuditTargetType] ?? log.target_type}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      #{log.target_id}
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate">
                      {log.reason}
                    </TableCell>
                    <TableCell>
                      {log.snapshot && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-3 w-3" />
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

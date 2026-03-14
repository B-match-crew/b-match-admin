"use client";

import { useEffect, useCallback } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { useReportStore } from "../model/report-store";
import { fetchReports } from "../api/report-api";
import type { Report } from "@/src/entities/report/types";
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
import { formatDate } from "@/src/shared/lib/format-date";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ITEMS_PER_PAGE = 20;

interface ReportTableProps {
  onSelectReport: (report: Report) => void;
}

export function ReportTable({ onSelectReport }: ReportTableProps) {
  const supabase = useSupabase();
  const {
    reports,
    isLoading,
    totalCount,
    page,
    statusFilter,
    setReports,
    setLoading,
    setStatusFilter,
    setPage,
  } = useReportStore();

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchReports(supabase, {
        status: statusFilter,
        page,
        limit: ITEMS_PER_PAGE,
      });
      setReports(result.reports, result.totalCount);
    } catch (error) {
      console.error("신고 목록 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, statusFilter, page, setReports, setLoading]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <div className="flex items-center justify-between">
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(
              value as "all" | "처리 대기" | "경고" | "정지" | "무혐의"
            )
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="처리 대기">처리 대기</SelectItem>
            <SelectItem value="경고">경고</SelectItem>
            <SelectItem value="정지">정지</SelectItem>
            <SelectItem value="무혐의">무혐의</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 테이블 */}
      {isLoading ? (
        <LoadingSpinner />
      ) : reports.length === 0 ? (
        <EmptyState title="신고가 없습니다" description="접수된 신고가 없습니다" />
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>신고자</TableHead>
                  <TableHead>피신고자</TableHead>
                  <TableHead>사유</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>접수일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow
                    key={report.id}
                    className="cursor-pointer"
                    onClick={() => onSelectReport(report)}
                  >
                    <TableCell className="font-medium">
                      {report.reporter_nickname ?? "-"}
                    </TableCell>
                    <TableCell>{report.reported_nickname ?? "-"}</TableCell>
                    <TableCell className="max-w-[250px]">
                      {truncateText(report.reason, 40)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={report.status} />
                    </TableCell>
                    <TableCell>{formatDate(report.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 페이지네이션 */}
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

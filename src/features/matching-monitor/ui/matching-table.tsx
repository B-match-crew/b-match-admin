"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { useMatchingStore } from "../model/matching-store";
import { fetchMatchings } from "../api/matching-api";
import type { Matching } from "@/src/entities/matching/types";
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
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
} from "lucide-react";

const ITEMS_PER_PAGE = 20;

interface MatchingTableProps {
  onViewDetail: (matching: Matching) => void;
  onDelete: (matching: Matching) => void;
}

export function MatchingTable({ onViewDetail, onDelete }: MatchingTableProps) {
  const supabase = useSupabase();
  const {
    matchings,
    isLoading,
    totalCount,
    page,
    searchQuery,
    statusFilter,
    setMatchings,
    setLoading,
    setSearch,
    setStatusFilter,
    setPage,
  } = useMatchingStore();

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMatchings = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchMatchings(supabase, {
        search: searchQuery,
        status: statusFilter,
        page,
        limit: ITEMS_PER_PAGE,
      });
      setMatchings(result.matchings, result.totalCount);
    } catch (error) {
      console.error("매칭 목록 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, searchQuery, statusFilter, page, setMatchings, setLoading]);

  useEffect(() => {
    loadMatchings();
  }, [loadMatchings]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearch(value);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setSearch(value);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      {/* 검색 + 필터 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="제목, 호스트, 장소로 검색"
            value={localSearch}
            onChange={handleSearchChange}
            className="pl-8"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as "all" | "모집중" | "마감" | "종료" | "취소")
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="모집중">모집중</SelectItem>
            <SelectItem value="마감">마감</SelectItem>
            <SelectItem value="종료">종료</SelectItem>
            <SelectItem value="취소">취소</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 테이블 */}
      {isLoading ? (
        <LoadingSpinner />
      ) : matchings.length === 0 ? (
        <EmptyState title="매칭이 없습니다" description="검색 조건을 변경해 보세요" />
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>제목</TableHead>
                  <TableHead>호스트</TableHead>
                  <TableHead>장소</TableHead>
                  <TableHead>날짜</TableHead>
                  <TableHead>인원</TableHead>
                  <TableHead>참가비</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matchings.map((matching) => (
                  <TableRow key={matching.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {matching.title}
                    </TableCell>
                    <TableCell>{matching.host_name}</TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {matching.location}
                    </TableCell>
                    <TableCell>{formatDate(matching.date)}</TableCell>
                    <TableCell>
                      {matching.current_members}/{matching.max_members}
                    </TableCell>
                    <TableCell>{formatCurrency(matching.fee)}</TableCell>
                    <TableCell>
                      <StatusBadge status={matching.recruitment_status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onViewDetail(matching)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onDelete(matching)}
                          disabled={matching.recruitment_status === "취소"}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
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

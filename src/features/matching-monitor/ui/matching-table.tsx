"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { useMatchingStore } from "../model/matching-store";
import { fetchMatchings } from "../api/matching-api";
import type { Match, MatchStatus } from "@/src/entities/matching/types";
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
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
} from "lucide-react";

const ITEMS_PER_PAGE = 20;

interface MatchingTableProps {
  onViewDetail: (match: Match) => void;
  onDelete: (match: Match) => void;
}

export function MatchingTable({ onViewDetail, onDelete }: MatchingTableProps) {
  const supabase = useSupabase();
  const {
    matches,
    isLoading,
    totalCount,
    page,
    searchQuery,
    statusFilter,
    setMatches,
    setLoading,
    setSearch,
    setStatusFilter,
    setPage,
  } = useMatchingStore();

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchMatchings(supabase, {
        search: searchQuery,
        status: statusFilter,
        page,
        limit: ITEMS_PER_PAGE,
      });
      setMatches(result.matches, result.totalCount);
    } catch (error) {
      console.error("매칭 목록 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, searchQuery, statusFilter, page, setMatches, setLoading]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

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

  const isCanceled = (status: MatchStatus) =>
    status === "CANCELED_BY_HOST" || status === "CANCELED_BY_ADMIN";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="제목, 장소로 검색"
            value={localSearch}
            onChange={handleSearchChange}
            className="pl-8"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as "all" | MatchStatus)}
        >
          <SelectTrigger>
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="RECRUITING">모집중</SelectItem>
            <SelectItem value="CLOSED">마감</SelectItem>
            <SelectItem value="IN_PROGRESS">진행중</SelectItem>
            <SelectItem value="ENDED">종료</SelectItem>
            <SelectItem value="CANCELED_BY_HOST">호스트 취소</SelectItem>
            <SelectItem value="CANCELED_BY_ADMIN">관리자 취소</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : matches.length === 0 ? (
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
                  <TableHead>시작일시</TableHead>
                  <TableHead>정원</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.map((match) => (
                  <TableRow key={match.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {match.title}
                    </TableCell>
                    <TableCell>
                      {match.host?.nickname ?? match.host_id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {match.location_name}
                    </TableCell>
                    <TableCell>{formatDate(match.start_time)}</TableCell>
                    <TableCell>{match.capacity ?? "-"}</TableCell>
                    <TableCell>
                      <StatusBadge status={match.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onViewDetail(match)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onDelete(match)}
                          disabled={isCanceled(match.status)}
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

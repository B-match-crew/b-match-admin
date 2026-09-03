"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/shared/ui/kit/table";
import { Button } from "@/src/shared/ui/kit/button";
import { Input } from "@/src/shared/ui/kit/input";
import { Checkbox } from "@/src/shared/ui/kit/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/shared/ui/kit/select";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { useAuth } from "@/src/app/providers/auth-provider";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { fetchMatches } from "../api/actions";
import type { MatchListItem, MatchSortBy } from "../model/actions";
import { type MatchStatus } from "@/src/shared/types/db";
import { DeleteMatchDialog } from "./delete-match-dialog";
import { MatchDetailDialog } from "./match-detail-dialog";
import { PAGE_SIZE } from "./schemas";

export function MatchesTab() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<MatchStatus | "ALL">("ALL");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [sortBy, setSortBy] = useState<MatchSortBy>("start_time");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [target, setTarget] = useState<MatchListItem | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["matches", status, includeDeleted, sortBy, dateFrom, dateTo, page],
    queryFn: () =>
      unwrap(
        fetchMatches({
          status,
          includeDeleted,
          sortBy,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
          dateTo: dateTo
            ? new Date(dateTo + "T23:59:59").toISOString()
            : undefined,
        })
      ),
  });

  const rows = data?.rows;
  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  const refetch = () =>
    queryClient.invalidateQueries({ queryKey: ["matches"] });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as MatchStatus | "ALL");
            setPage(0);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체</SelectItem>
            <SelectItem value="RECRUITING">모집중</SelectItem>
            <SelectItem value="CLOSED">마감</SelectItem>
            <SelectItem value="ENDED">종료</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sortBy}
          onValueChange={(v) => {
            setSortBy(v as MatchSortBy);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="start_time">모집 일자순</SelectItem>
            <SelectItem value="created_at">최신 등록순</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(0);
            }}
            className="w-36"
            placeholder="시작일"
          />
          <span className="text-muted-foreground">~</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(0);
            }}
            className="w-36"
            placeholder="종료일"
          />
          {(dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
                setPage(0);
              }}
            >
              초기화
            </Button>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={includeDeleted}
            onCheckedChange={(v) => {
              setIncludeDeleted(v === true);
              setPage(0);
            }}
          />
          삭제된 모임 포함
        </label>
        <Button variant="outline" size="sm" onClick={refetch}>
          새로고침
        </Button>
      </div>

      {isError && (
        <QueryError section="매칭 목록" error={error} onRetry={refetch} />
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>제목</TableHead>
              <TableHead>호스트</TableHead>
              <TableHead>지역</TableHead>
              <TableHead>시작</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">조회수</TableHead>
              <TableHead className="text-right">찜</TableHead>
              <TableHead className="text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            )}
            {!isLoading && (rows?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={9}>
                  <EmptyState message="매칭이 없습니다." />
                </TableCell>
              </TableRow>
            )}
            {rows?.map((m) => (
              <TableRow
                key={m.id}
                className="cursor-pointer"
                onClick={() => setDetailId(m.id)}
              >
                <TableCell className="font-mono text-xs">#{m.id}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.title}</span>
                    {m.deleted_at && <StatusBadge status="DELETED" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {m.location_name}
                  </p>
                </TableCell>
                <TableCell>{m.host?.nickname ?? m.host?.name ?? "-"}</TableCell>
                <TableCell className="text-sm">{m.region_1}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(m.start_time)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={m.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {(m.view_count ?? 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {(m.favorite_count ?? 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <div onClick={(e) => e.stopPropagation()}>
                    {role === "SUPER_ADMIN" && !m.deleted_at && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setTarget(m)}
                      >
                        직권 삭제
                      </Button>
                    )}
                  </div>
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

      <MatchDetailDialog
        matchId={detailId}
        onClose={() => setDetailId(null)}
      />

      <DeleteMatchDialog
        match={target}
        onClose={() => setTarget(null)}
        onDone={() => {
          setTarget(null);
          toast.success("매칭이 삭제되었습니다");
          refetch();
        }}
      />
    </div>
  );
}

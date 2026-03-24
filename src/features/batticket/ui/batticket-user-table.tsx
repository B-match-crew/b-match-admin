"use client";

import { useEffect, useCallback, useState } from "react";
import { useBatticketStore } from "../model/batticket-store";
import { adminFetchBatticketUsers } from "@/src/app/actions/admin-read-actions";
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
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { LoadingSpinner } from "@/src/shared/ui/loading-spinner";
import { EmptyState } from "@/src/shared/ui/empty-state";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 20;

interface UserRow {
  id: string;
  nickname: string;
  real_name: string | null;
  badticket_score: number;
  status: string;
  is_host: boolean;
}

export function BatticketUserTable() {
  const {
    isLoading,
    totalCount,
    page,
    searchQuery,
    setLoading,
    setTotalCount,
    setPage,
    setSearch,
    setSelectedUser,
  } = useBatticketStore();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [inputValue, setInputValue] = useState(searchQuery);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminFetchBatticketUsers({
        search: searchQuery,
        page,
        limit: ITEMS_PER_PAGE,
      });
      setUsers(result.users);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error("배티켓 사용자 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page, setLoading, setTotalCount]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = () => {
    setSearch(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const getScoreColor = (score: number) => {
    if (score < 10) return "text-red-700 bg-red-50";
    if (score < 15) return "text-red-600 bg-red-50";
    if (score < 20) return "text-yellow-700 bg-yellow-50";
    return "text-emerald-700 bg-emerald-50";
  };

  const getScoreLabel = (score: number) => {
    if (score < 10) return "제한 검토";
    if (score < 15) return "경고";
    if (score < 20) return "주의";
    return "양호";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="닉네임 또는 실명 검색"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleSearch}>
          검색
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : users.length === 0 ? (
        <EmptyState
          title="사용자가 없습니다"
          description="검색 조건을 변경해보세요"
        />
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>닉네임</TableHead>
                  <TableHead>실명</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>배티켓 점수</TableHead>
                  <TableHead>등급</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.nickname}
                    </TableCell>
                    <TableCell>{user.real_name ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {user.is_host ? "호스트" : "게스트"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={user.status} />
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-bold">
                        {user.badticket_score.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-medium",
                          getScoreColor(user.badticket_score)
                        )}
                      >
                        {getScoreLabel(user.badticket_score)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setSelectedUser(user.id, user.nickname)
                        }
                      >
                        <History className="mr-1 h-3 w-3" />
                        이력
                      </Button>
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

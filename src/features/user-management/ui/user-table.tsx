"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { useUserStore } from "../model/user-store";
import { fetchUsers } from "../api/user-api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { LoadingSpinner } from "@/src/shared/ui/loading-spinner";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { formatDate } from "@/src/shared/lib/format-date";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ITEMS_PER_PAGE = 20;

export function UserTable() {
  const supabase = useSupabase();
  const router = useRouter();
  const {
    users,
    isLoading,
    totalCount,
    page,
    searchQuery,
    filters,
    setUsers,
    setLoading,
    setPage,
  } = useUserStore();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchUsers(supabase, {
        search: searchQuery,
        status: filters.status,
        role: filters.role,
        page,
        limit: ITEMS_PER_PAGE,
      });
      setUsers(result.users, result.totalCount);
    } catch (error) {
      console.error("유저 목록 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, searchQuery, filters.status, filters.role, page, setUsers, setLoading]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const getUserStatus = (user: { is_active: boolean }) => {
    if (!user.is_active) return "정지";
    return "정상";
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (users.length === 0) {
    return <EmptyState title="유저가 없습니다" description="검색 조건을 변경해 보세요" />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>닉네임</TableHead>
              <TableHead>실명</TableHead>
              <TableHead>성별</TableHead>
              <TableHead>연령</TableHead>
              <TableHead>급수</TableHead>
              <TableHead>배티켓</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>가입일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow
                key={user.id}
                className="cursor-pointer"
                onClick={() => router.push(`/users/${user.id}`)}
              >
                <TableCell className="font-medium">{user.nickname}</TableCell>
                <TableCell>{user.real_name}</TableCell>
                <TableCell>{user.gender}</TableCell>
                <TableCell>{user.age}</TableCell>
                <TableCell>{user.skill_level}</TableCell>
                <TableCell>{user.battiket_score}</TableCell>
                <TableCell>
                  <StatusBadge status={getUserStatus(user)} />
                </TableCell>
                <TableCell>
                  {user.created_at ? formatDate(user.created_at) : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          총 {totalCount}명 중 {(page - 1) * ITEMS_PER_PAGE + 1}-
          {Math.min(page * ITEMS_PER_PAGE, totalCount)}명
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
    </div>
  );
}

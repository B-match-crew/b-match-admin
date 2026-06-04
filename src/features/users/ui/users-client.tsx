"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { formatDate } from "@/src/shared/lib/format-date";
import {
  searchUsers,
  unsuspendUserAction,
  type UserListItem,
} from "@/src/features/users/actions";
import { toUserMessage } from "@/src/shared/lib/error-codes";
import { UserActionDialog } from "./user-action-dialog";
import { UserDetailDialog } from "./user-detail-dialog";
import { downloadCsv } from "@/src/shared/lib/csv-export";

const PAGE_SIZE = 50;

export function UsersClient() {
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [submittedTerm, setSubmittedTerm] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<UserListItem | null>(null);
  const [actionMode, setActionMode] = useState<"suspend" | "ban" | null>(null);
  const [detailUser, setDetailUser] = useState<UserListItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["users", submittedTerm, includeDeleted, page],
    queryFn: () =>
      searchUsers({
        term: submittedTerm,
        includeDeleted,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const handleUnsuspend = async (u: UserListItem) => {
    try {
      await unsuspendUserAction(u.id);
      toast.success("정지가 해제되었습니다");
      refetch();
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmittedTerm(term);
            setPage(0);
          }}
        >
          <Input
            placeholder="실명 / 닉네임 / 전화번호 / UUID 검색"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="max-w-md"
          />
          <Button type="submit">검색</Button>
        </form>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={includeDeleted}
            onCheckedChange={(v) => {
              setIncludeDeleted(v === true);
              setPage(0);
            }}
          />
          탈퇴 유저 포함
        </label>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          총 {data?.total ?? 0}명
        </p>
        {data && data.rows.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              downloadCsv(
                `users_${new Date().toISOString().slice(0, 10)}.csv`,
                ["ID", "닉네임", "실명", "전화번호", "상태", "호스트", "역할", "가입일"],
                data.rows.map((u) => [
                  String(u.id),
                  u.nickname ?? "",
                  u.name ?? "",
                  u.phone_number ?? "",
                  u.user_status,
                  u.is_host ? "Y" : "N",
                  u.admin_role ?? "",
                  u.created_at,
                ])
              );
            }}
          >
            CSV 다운로드
          </Button>
        )}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>닉네임</TableHead>
              <TableHead>실명</TableHead>
              <TableHead>전화번호</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>역할</TableHead>
              <TableHead>가입일</TableHead>
              <TableHead className="text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            )}
            {!isLoading && (data?.rows.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState message="검색 결과가 없습니다." />
                </TableCell>
              </TableRow>
            )}
            {data?.rows.map((u) => (
              <TableRow
                key={u.id}
                className="cursor-pointer"
                onClick={() => setDetailUser(u)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{u.nickname ?? "-"}</span>
                    {u.deleted_at && <StatusBadge status="DELETED" />}
                  </div>
                </TableCell>
                <TableCell>{u.name ?? "-"}</TableCell>
                <TableCell className="font-mono text-xs">
                  {u.phone_number ?? "-"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={u.user_status} />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {u.is_host && <Badge variant="outline">호스트</Badge>}
                    {u.admin_role && <StatusBadge status={u.admin_role} />}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(u.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <div
                    className="flex justify-end gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {u.user_status === "ACTIVE" && !u.deleted_at && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelected(u);
                            setActionMode("suspend");
                          }}
                        >
                          정지
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelected(u);
                            setActionMode("ban");
                          }}
                        >
                          차단
                        </Button>
                      </>
                    )}
                    {u.user_status === "SUSPENDED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnsuspend(u)}
                      >
                        정지 해제
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

      <UserDetailDialog
        user={detailUser}
        onClose={() => setDetailUser(null)}
      />

      <UserActionDialog
        user={selected}
        mode={actionMode}
        onClose={() => {
          setSelected(null);
          setActionMode(null);
        }}
        onDone={() => {
          setSelected(null);
          setActionMode(null);
          toast.success("처리되었습니다");
          refetch();
        }}
      />
    </div>
  );
}

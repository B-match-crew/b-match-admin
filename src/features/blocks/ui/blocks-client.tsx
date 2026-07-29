"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { SegmentedTab } from "@/src/shared/ui/bds/segmented-tab";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { fetchBlockRanking, fetchBlacklist } from "@/src/features/blocks/actions";

const TABS = [
  { value: "ranking", label: "차단 랭킹" },
  { value: "blacklist", label: "영구 차단 목록" },
] as const;

export function BlocksClient() {
  const [tab, setTab] = useState<"ranking" | "blacklist">("ranking");

  return (
    <div className="space-y-4">
      <div className="w-72">
        <SegmentedTab items={TABS} value={tab} onValueChange={setTab} size="sm" />
      </div>
      {tab === "ranking" ? <RankingTab /> : <BlacklistTab />}
    </div>
  );
}

// ─── 차단 랭킹 ───

function RankingTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["block-ranking"],
    queryFn: () => fetchBlockRanking(50),
  });

  return (
    <div className="space-y-2">
      <p className="text-bds-caption2 text-bds-label-alternative">
        여러 명에게 반복 차단당한 유저일수록 위에 옵니다. 서로 다른 차단자
        수(신뢰도)를 우선 정렬합니다. 상위 50명.
      </p>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">순위</TableHead>
              <TableHead>유저</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">차단자 수</TableHead>
              <TableHead className="text-right">총 차단</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <SkeletonRows cols={5} />}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState message="차단 기록이 없습니다." />
                </TableCell>
              </TableRow>
            )}
            {data?.map((r, i) => (
              <TableRow key={r.blocked_id}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {i + 1}
                </TableCell>
                <TableCell>
                  <span className="font-medium">
                    {r.nickname ?? r.name ?? `#${r.blocked_id}`}
                  </span>
                  <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                    #{r.blocked_id}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.user_status} />
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {r.blockerCount}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {r.blockCount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── 영구 차단 목록 ───

const PAGE_SIZE = 50;

function BlacklistTab() {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useQuery({
    queryKey: ["blacklist", page],
    queryFn: () => fetchBlacklist(PAGE_SIZE, page * PAGE_SIZE),
  });

  const rows = data?.rows;
  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  return (
    <div className="space-y-2">
      <p className="text-bds-caption2 text-bds-label-alternative">
        영구 차단(재가입 차단)된 CI 목록입니다. 정지·영구차단 유저가 탈퇴할 때
        본인인증 해시(CI)가 등록됩니다.
      </p>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>유저</TableHead>
              <TableHead>CI 해시</TableHead>
              <TableHead>사유</TableHead>
              <TableHead>등록일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <SkeletonRows cols={5} />}
            {!isLoading && (rows?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState message="영구 차단된 계정이 없습니다." />
                </TableCell>
              </TableRow>
            )}
            {rows?.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-mono text-xs">#{b.id}</TableCell>
                <TableCell>
                  {b.user ? (
                    <>
                      <span className="font-medium">
                        {b.user.nickname ?? b.user.name ?? `#${b.user.id}`}
                      </span>
                      <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                        #{b.user.id}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">탈퇴 계정</span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {maskCi(b.ci_hash)}
                </TableCell>
                <TableCell className="max-w-xs truncate text-sm">
                  {b.reason}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(b.created_at)}
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
          <span className="text-bds-body3 text-muted-foreground">
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
    </div>
  );
}

/** CI 해시는 민감정보 — 앞뒤 일부만 노출 */
function maskCi(ci: string): string {
  if (ci.length <= 12) return ci;
  return `${ci.slice(0, 6)}…${ci.slice(-4)}`;
}

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

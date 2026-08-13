"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { InfoField, InfoGrid } from "@/src/shared/ui/info-field";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { fetchClubs, fetchClubDetail } from "@/src/features/clubs/actions";

const PAGE_SIZE = 50;

export function ClubsClient() {
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [submittedTerm, setSubmittedTerm] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [page, setPage] = useState(0);
  const [detailId, setDetailId] = useState<number | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["clubs", submittedTerm, includeDeleted, page],
    queryFn: () =>
      unwrap(
        fetchClubs({
          term: submittedTerm,
          includeDeleted,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        })
      ),
  });

  const rows = data?.rows;
  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  const search = () => {
    setSubmittedTerm(term.trim());
    setPage(0);
  };
  const refetch = () => queryClient.invalidateQueries({ queryKey: ["clubs"] });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="모임명 검색"
            className="w-56"
          />
          <Button variant="outline" size="sm" onClick={search}>
            검색
          </Button>
        </div>

        <label className="flex items-center gap-2 text-bds-body3">
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
        <QueryError section="모임 목록" error={error} onRetry={refetch} />
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>모임명</TableHead>
              <TableHead>모임장</TableHead>
              <TableHead>최소 급수</TableHead>
              <TableHead>성비 (남/여)</TableHead>
              <TableHead className="text-right">매칭 (진행/전체)</TableHead>
              <TableHead>개설일</TableHead>
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
            {!isLoading && (rows?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState message="모임이 없습니다." />
                </TableCell>
              </TableRow>
            )}
            {rows?.map((c) => (
              <TableRow
                key={c.id}
                className="cursor-pointer"
                onClick={() => setDetailId(c.id)}
              >
                <TableCell className="font-mono text-xs">#{c.id}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.club_name}</span>
                    {c.deleted_at && <StatusBadge status="DELETED" />}
                  </div>
                </TableCell>
                <TableCell>{c.host?.nickname ?? c.host?.name ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{c.min_level_required}</Badge>
                </TableCell>
                <TableCell className="text-sm tabular-nums text-muted-foreground">
                  {c.gender_ratio_male} / {c.gender_ratio_female}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {c.activeMatchCount} / {c.matchCount}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(c.created_at)}
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

      <ClubDetailDialog clubId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

// ─── 모임 상세 ───

function ClubDetailDialog({
  clubId,
  onClose,
}: {
  clubId: number | null;
  onClose: () => void;
}) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["club-detail", clubId],
    queryFn: () => unwrap(fetchClubDetail(clubId!)),
    enabled: clubId !== null,
  });

  return (
    <Dialog open={clubId !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>모임 상세 #{clubId}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : isError ? (
          <QueryError error={error} onRetry={() => void refetch()} />
        ) : data ? (
          <div className="space-y-4 text-sm">
            <InfoGrid>
              <InfoField label="모임명">{data.club_name}</InfoField>
              <InfoField label="모임장">
                {data.host?.nickname ?? data.host?.name ?? "-"}
              </InfoField>
              <InfoField label="연락처">
                {data.host?.phone_number ?? "-"}
              </InfoField>
              <InfoField label="삭제 여부">
                {data.deleted_at ? <StatusBadge status="DELETED" /> : "아니오"}
              </InfoField>
              <InfoField label="최소 급수">
                <Badge variant="outline">{data.min_level_required}</Badge>
              </InfoField>
              <InfoField label="성비 (남/여)">
                {data.gender_ratio_male} / {data.gender_ratio_female}
              </InfoField>
              <InfoField label="매칭 (진행/전체)">
                {data.activeMatchCount} / {data.matchCount}
              </InfoField>
              <InfoField label="개설일">
                {formatDateTime(data.created_at)}
              </InfoField>
              <InfoField
                label={
                  data.contact_type === "URL" ? "연락처 (URL)" : "연락처 (전화)"
                }
                className="col-span-2"
              >
                {data.contact_value ?? (
                  <span className="text-bds-label-assistive">
                    미등록 (구버전 앱에서 개설)
                  </span>
                )}
              </InfoField>
            </InfoGrid>

            {data.description && (
              <div className="rounded-lg border p-3 space-y-2">
                <h4 className="text-bds-heading3">모임 소개</h4>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {data.description}
                </p>
              </div>
            )}

            {/* 성별 분포 막대 */}
            <div className="rounded-lg border p-3 space-y-2">
              <h4 className="text-bds-heading3">성별 구성</h4>
              <div className="flex h-6 overflow-hidden rounded-md">
                <div
                  className="flex items-center justify-center text-bds-caption3 text-white"
                  style={{
                    width: `${data.gender_ratio_male}%`,
                    background: "var(--color-series-2)",
                  }}
                >
                  {data.gender_ratio_male > 8 && `남 ${data.gender_ratio_male}%`}
                </div>
                <div
                  className="flex items-center justify-center text-bds-caption3 text-white"
                  style={{
                    width: `${data.gender_ratio_female}%`,
                    background: "var(--color-bds-accent-500)",
                  }}
                >
                  {data.gender_ratio_female > 8 &&
                    `여 ${data.gender_ratio_female}%`}
                </div>
              </div>
            </div>

            {/* 연령대 분포 */}
            <DistributionRows
              title="연령대 분포"
              entries={[
                ["20대", data.age_distribution["20s"]],
                ["30대", data.age_distribution["30s"]],
                ["40대", data.age_distribution["40s"]],
                ["50대", data.age_distribution["50s"]],
                ["60대 이상", data.age_distribution["60s_plus"]],
              ]}
            />

            {/* 급수 분포 */}
            <DistributionRows
              title="급수 분포"
              entries={[
                ["A", data.level_distribution.A],
                ["B", data.level_distribution.B],
                ["C", data.level_distribution.C],
                ["D", data.level_distribution.D],
                ["노비스", data.level_distribution.novice],
                ["비기너", data.level_distribution.beginner],
              ]}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DistributionRows({
  title,
  entries,
}: {
  title: string;
  entries: [string, number | undefined][];
}) {
  const total = entries.reduce((s, [, v]) => s + (v ?? 0), 0);
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <h4 className="text-bds-heading3">{title}</h4>
      {total === 0 ? (
        <p className="text-bds-caption2 text-muted-foreground">
          집계된 데이터가 없습니다.
        </p>
      ) : (
        <div className="space-y-1.5">
          {entries.map(([label, v]) => {
            const val = v ?? 0;
            const pct = total > 0 ? Math.round((val / total) * 100) : 0;
            return (
              <div key={label} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-bds-caption2 text-muted-foreground">
                  {label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-bds-back-strong">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: "var(--color-series-1)",
                    }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right text-bds-caption2 tabular-nums text-foreground">
                  {val}명 · {pct}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

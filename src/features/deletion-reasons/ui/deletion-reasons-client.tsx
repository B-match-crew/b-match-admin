"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { HeartCrack, MessageSquareQuote, ShieldOff } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/shared/ui/kit/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/shared/ui/kit/table";
import { Badge } from "@/src/shared/ui/kit/badge";
import { Button } from "@/src/shared/ui/kit/button";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { SegmentedTab } from "@/src/shared/ui/bds/segmented-tab";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { WarningBox } from "@/src/shared/ui/warning-box";
import { unwrap } from "@/src/shared/lib/unwrap";
import { formatNumber } from "@/src/shared/lib/format-number";
import { formatKst } from "@/src/shared/lib/format-date";
import { kstRange } from "@/src/shared/lib/kst-range";
import {
  fetchDeletionReasonSummary,
  fetchDeletionReasonDetails,
} from "../actions";
import {
  DELETION_REASON_LABEL,
  LEGACY_REASON_CODE,
} from "../constants";

const RANGES = [
  { value: "30", label: "30일" },
  { value: "90", label: "90일" },
  { value: "all", label: "전체" },
] as const;

type Range = (typeof RANGES)[number]["value"];

const PAGE_SIZE = 50;

export function DeletionReasonsClient() {
  const [range, setRange] = useState<Range>("all");

  return (
    <div className="space-y-6">
      <SummarySection range={range} onRangeChange={setRange} />
      <DetailSection />
    </div>
  );
}

// ─── 집계 ───

function SummarySection({
  range,
  onRangeChange,
}: {
  range: Range;
  onRangeChange: (v: Range) => void;
}) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["deletion-reason-summary", range],
    queryFn: () =>
      unwrap(
        fetchDeletionReasonSummary(
          range === "all" ? undefined : kstRange(Number(range))
        )
      ),
    placeholderData: keepPreviousData,
  });

  if (isError) {
    return (
      <QueryError
        section="탈퇴 사유"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  const rows = data ?? [];
  // 코드별로 접어 호스트/일반을 한 줄에 나란히 둔다 — 같은 사유라도 모임장이
  // 떠나는 것과 참가자가 떠나는 것은 대응이 다르다.
  const byCode = new Map<string, { host: number; guest: number }>();
  for (const r of rows) {
    const cur = byCode.get(r.reasonCode) ?? { host: 0, guest: 0 };
    if (r.wasHost) cur.host += r.cnt;
    else cur.guest += r.cnt;
    byCode.set(r.reasonCode, cur);
  }
  const codes = [...byCode.entries()].sort(
    (a, b) => b[1].host + b[1].guest - (a[1].host + a[1].guest)
  );
  const totalHost = rows.filter((r) => r.wasHost).reduce((s, r) => s + r.cnt, 0);
  const totalGuest = rows
    .filter((r) => !r.wasHost)
    .reduce((s, r) => s + r.cnt, 0);
  const legacy = byCode.get(LEGACY_REASON_CODE);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HeartCrack className="size-4" />
              탈퇴 사유
            </CardTitle>
            <CardDescription>
              사유는 <b>익명</b>으로 저장됩니다 — 누가 썼는지는 남기지 않고,
              탈퇴 시점에 <b>모임장이었는지</b>만 함께 둡니다. 한 사람이 여러
              사유를 고를 수 있어 합계가 탈퇴자 수보다 클 수 있습니다.
            </CardDescription>
          </div>
          <div className="w-56">
            <SegmentedTab
              items={RANGES}
              value={range}
              onValueChange={onRangeChange}
              size="sm"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Skeleton className="h-40" />}

        {!isLoading && legacy && (
          <WarningBox tone="caution">
            앱 1.1.1 이하가 남긴 행이 {formatNumber(legacy.host + legacy.guest)}
            건 있습니다. 그 버전은 사유를 코드가 아니라 한 줄 문자열로 보내서
            항목별 집계가 안 됩니다 — 내용은 아래 <b>자유입력</b> 목록에
            그대로 있습니다. 1.1.2 부터 코드가 들어옵니다.
          </WarningBox>
        )}

        {!isLoading && codes.length === 0 && (
          <EmptyState
            message="이 기간에 남겨진 탈퇴 사유가 없습니다"
            description="사유는 선택이라, 탈퇴했더라도 아무것도 안 적었으면 행이 생기지 않습니다."
          />
        )}

        {!isLoading && codes.length > 0 && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Tile
                label="모임장 탈퇴 사유"
                value={totalHost}
                tone={totalHost > 0 ? "warning" : undefined}
                hint="모임장이 떠나면 그 모임의 모집글도 함께 사라집니다"
              />
              <Tile label="일반 유저 탈퇴 사유" value={totalGuest} />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>사유</TableHead>
                  <TableHead className="text-right">모임장</TableHead>
                  <TableHead className="text-right">일반</TableHead>
                  <TableHead className="text-right">합계</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map(([code, c]) => (
                  <TableRow key={code}>
                    <TableCell>
                      <ReasonLabel code={code} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.host > 0 ? (
                        <span className="font-medium text-bds-status-warning-text">
                          {formatNumber(c.host)}
                        </span>
                      ) : (
                        0
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatNumber(c.guest)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatNumber(c.host + c.guest)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── 자유입력 ───

function DetailSection() {
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["deletion-reason-details", page],
    queryFn: () =>
      unwrap(
        fetchDeletionReasonDetails({
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        })
      ),
    placeholderData: keepPreviousData,
  });

  if (isError) {
    return (
      <QueryError
        section="자유입력"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  const rows = data ?? [];
  // 서버는 총 개수를 주지 않는다(익명 통계라 굳이 필요 없다). 한 페이지가 꽉
  // 찼으면 다음이 있다고 본다 — 마지막 페이지가 정확히 꽉 차면 빈 페이지를
  // 한 번 볼 수 있는데, 그 값에 비해 count 쿼리를 더 도는 편이 비싸다.
  const hasNext = rows.length === PAGE_SIZE;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquareQuote className="size-4" />
          자유입력
        </CardTitle>
        <CardDescription>
          사용자가 직접 적은 내용입니다. 최신순이며 <b>식별 정보가 없습니다</b>{" "}
          — 여기서 특정 사용자를 찾아갈 수는 없습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Skeleton className="h-48" />}

        {!isLoading && rows.length === 0 && (
          <EmptyState
            message={
              page === 0
                ? "남겨진 내용이 없습니다"
                : "이 페이지에는 더 이상 없습니다"
            }
          />
        )}

        {!isLoading && rows.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">탈퇴 시각</TableHead>
                <TableHead className="w-24">유형</TableHead>
                <TableHead className="w-64">고른 사유</TableHead>
                <TableHead>직접 입력</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatKst(r.createdAt)}
                  </TableCell>
                  <TableCell>
                    {r.wasHost ? (
                      <Badge className="bg-bds-status-warning-subtle text-bds-status-warning-text">
                        <ShieldOff className="mr-1 size-3" />
                        모임장
                      </Badge>
                    ) : (
                      <Badge className="bg-bds-back-strong text-bds-label-neutral">
                        일반
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="space-x-1 space-y-1">
                    {r.reasonCodes && r.reasonCodes.length > 0 ? (
                      r.reasonCodes.map((c) => (
                        <Badge
                          key={c}
                          className="bg-bds-status-info-subtle text-bds-status-info-text"
                        >
                          {DELETION_REASON_LABEL[c] ?? c}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-bds-caption2 text-bds-label-alternative">
                        구버전 앱 (코드 없음)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-md break-words text-sm">
                    {r.detail ?? (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {(page > 0 || hasNext) && (
          <div className="flex items-center justify-end gap-2">
            <span className="text-bds-caption2 text-bds-label-alternative">
              {page + 1} 페이지
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0 || isFetching}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              이전
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext || isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              다음
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── 공용 ───

function ReasonLabel({ code }: { code: string }) {
  if (code === LEGACY_REASON_CODE) {
    return (
      <span className="text-muted-foreground">
        {LEGACY_REASON_CODE}{" "}
        <span className="text-bds-caption2">— 앱 1.1.1 이하</span>
      </span>
    );
  }
  const label = DELETION_REASON_LABEL[code];
  return label ? (
    <span>{label}</span>
  ) : (
    // 앱이 새 코드를 추가했는데 여기 라벨이 없는 경우 — 깨지지 않고 코드가 보인다.
    <span className="font-mono text-xs">{code}</span>
  );
}

function Tile({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone?: "danger" | "warning";
  hint?: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-bds-caption2 text-bds-label-assistive">{label}</div>
      <div
        className={`mt-0.5 text-bds-title3 tabular-nums ${
          tone === "danger"
            ? "text-bds-status-error-text"
            : tone === "warning"
              ? "text-bds-status-warning-text"
              : "text-foreground"
        }`}
      >
        {formatNumber(value)}
      </div>
      {hint && (
        <div className="text-bds-caption2 text-bds-label-alternative">{hint}</div>
      )}
    </div>
  );
}

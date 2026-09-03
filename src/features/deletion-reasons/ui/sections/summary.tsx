"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { HeartCrack } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/shared/ui/kit/table";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { SegmentedTab } from "@/src/shared/ui/bds/segmented-tab";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { WarningBox } from "@/src/shared/ui/warning-box";
import { unwrap } from "@/src/shared/lib/unwrap";
import { formatNumber } from "@/src/shared/lib/format-number";
import { kstRange } from "@/src/shared/lib/kst-range";
import { fetchDeletionReasonSummary } from "../../api/actions";
import { LEGACY_REASON_CODE } from "../../model/constants";
import { ReasonLabel, Tile } from "../primitives";
import { RANGES, Range } from "../tokens";

export function SummarySection({
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

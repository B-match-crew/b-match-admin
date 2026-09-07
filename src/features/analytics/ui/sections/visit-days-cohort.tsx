"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { SegmentedTab } from "@/src/shared/ui/bds/segmented-tab";
import { unwrap } from "@/src/shared/lib/unwrap";
import type { RetentionGroup, CohortCoverageItem } from "../../model/actions";
import { fetchVisitDaysByCohort, fetchCohortCoverage } from "../../api/actions";

const WINDOWS = [
  { value: "7", label: "7일 창" },
  { value: "14", label: "14일 창" },
  { value: "30", label: "30일 창" },
] as const;

/** 가로 막대에서 몇 개까지 그릴지. 그 이상은 "N일+" 로 접는다. */
const MAX_BARS = 10;

/**
 * 주차 코호트별 방문일 수 분포 (108).
 *
 * 합산 분포(106)와 나눈 이유: 신규 유입이 빠르게 늘어(174 → 897) 합산값이
 * 사실상 최신 코호트의 모양에 지배된다. 개선/악화가 있어도 묻힌다.
 *
 * 🔴 각 주의 비율은 **그 주 안에서** 계산된다. 기기 수를 주끼리 비교하면
 * 형태가 아니라 유입량이 보인다.
 */
export function VisitDaysCohortSection({
  days,
  group,
}: {
  days: number;
  group: RetentionGroup;
}) {
  const [win, setWin] = useState<"7" | "14" | "30">("7");
  const w = Number(win);

  const q = useQuery({
    queryKey: ["analytics-visit-days-cohort", days, group, w],
    queryFn: () => unwrap(fetchVisitDaysByCohort(Math.max(days, 90), group, w)),
  });

  // 커버리지는 그룹·창과 무관하다 — 기간만 탄다.
  const cov = useQuery({
    queryKey: ["analytics-cohort-coverage", days],
    queryFn: () => unwrap(fetchCohortCoverage(Math.max(days, 90))),
  });

  const covByWeek = new Map((cov.data ?? []).map((c) => [c.week, c]));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-bds-heading3">
              방문일 수 분포 — 코호트별
            </CardTitle>
            <p className="text-bds-caption2 text-bds-label-alternative">
              최초 실행 주차별로 나눠 본 분포. 각 줄의 비율은 <b>그 주 안에서</b>{" "}
              계산됩니다 — 주마다 유입 규모가 달라 기기 수로는 형태를 비교할 수 없습니다.
            </p>
          </div>
          <div className="w-56">
            <SegmentedTab items={WINDOWS} value={win} onValueChange={(v) => setWin(v)} size="sm" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <Skeleton className="h-[240px] w-full" />
        ) : q.isError ? (
          <QueryError
            section="코호트별 방문일 수"
            error={q.error}
            onRetry={() => void q.refetch()}
          />
        ) : !q.data?.length ? (
          <EmptyState
            message={`${w}일 창을 모두 채운 코호트가 아직 없습니다. 더 짧은 창으로 보세요.`}
          />
        ) : (
          <div className="space-y-5">
            {q.data.map((week) => (
              <WeekRow
                key={week.week}
                week={week.week}
                cohortSize={week.cohortSize}
                bars={week.bars}
                coverage={covByWeek.get(week.week)}
              />
            ))}
          </div>
        )}

        <div className="mt-4 space-y-1 text-bds-caption2 text-bds-label-assistive">
          <p>
            <b>그 주의 마지막 날까지 창이 다 찬 주만</b> 나옵니다. 기기 단위로만
            걸면 한 주 안에서 앞쪽 요일만 남아 “1일 방문” 쪽으로 쏠립니다.
          </p>
          <p>
            <b>커버리지</b>는 그 주에 앱을 새로 깐 기기 중 첫날 활성이 기록된 비율입니다.
            낮은 주는 표본이 얇아 형태를 그대로 읽으면 안 됩니다 — 2026-08 초는 방문
            기록 기능이 막 배포되던 때라 특히 낮습니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function WeekRow({
  week,
  cohortSize,
  bars,
  coverage,
}: {
  week: string;
  cohortSize: number;
  bars: { days: number; devices: number; share: number }[];
  coverage?: CohortCoverageItem;
}) {
  // 빠진 방문일수는 0% 로 채워 주 사이에 칸이 어긋나지 않게 한다.
  const byDays = new Map(bars.map((b) => [b.days, b]));
  const cells = Array.from({ length: MAX_BARS }, (_, i) => {
    const d = i + 1;
    return { days: d, share: byDays.get(d)?.share ?? 0, devices: byDays.get(d)?.devices ?? 0 };
  });
  const overflow = bars.filter((b) => b.days > MAX_BARS);
  const overflowShare = overflow.reduce((s, b) => s + b.share, 0);
  const once = byDays.get(1)?.share ?? 0;

  const low = coverage?.coverage != null && coverage.coverage < 70;

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-bds-body2 text-bds-label-normal">{week}</span>
        <span className="text-bds-caption2 text-bds-label-alternative">
          {cohortSize.toLocaleString()}대
        </span>
        <span className="text-bds-caption2 text-bds-label-alternative">
          1일만 <b className="text-bds-label-normal">{once}%</b>
        </span>
        {coverage && (
          <span
            className={
              low
                ? "text-bds-caption2 font-medium text-bds-status-warning-text"
                : "text-bds-caption2 text-bds-label-assistive"
            }
            title={`등록 ${coverage.registered.toLocaleString()}대 중 첫날 활성이 잡힌 기기 ${coverage.observable.toLocaleString()}대`}
          >
            {low ? "⚠️ " : ""}커버리지 {coverage.coverage}%
            {low && " — 표본 얇음"}
          </span>
        )}
      </div>

      <div className="flex gap-[2px]">
        {cells.map((c) => (
          <div key={c.days} className="flex-1">
            <div
              className="relative h-16 bg-bds-gray-100"
              title={`${c.days}일 방문 · ${c.devices.toLocaleString()}대 · ${c.share}%`}
            >
              <div
                className="absolute inset-x-0 bottom-0 bg-bds-primary-500"
                style={{ height: `${Math.min(100, c.share)}%` }}
              />
            </div>
            <div className="mt-1 text-center text-bds-caption2 text-bds-label-assistive">
              {c.days}
            </div>
          </div>
        ))}
        {overflowShare > 0 && (
          <div className="flex-1">
            <div
              className="relative h-16 bg-bds-gray-100"
              title={`${MAX_BARS + 1}일 이상 · ${overflowShare.toFixed(1)}%`}
            >
              <div
                className="absolute inset-x-0 bottom-0 bg-bds-primary-900"
                style={{ height: `${Math.min(100, overflowShare)}%` }}
              />
            </div>
            <div className="mt-1 text-center text-bds-caption2 text-bds-label-assistive">
              {MAX_BARS}+
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

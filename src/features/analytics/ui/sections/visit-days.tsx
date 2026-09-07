"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { SegmentedTab } from "@/src/shared/ui/bds/segmented-tab";
import { unwrap } from "@/src/shared/lib/unwrap";
import type { RetentionGroup, VisitDaysItem } from "../../model/actions";
import { fetchVisitDaysDist } from "../../api/actions";
import { AXIS_TICK, SERIES_1 } from "../chart-tokens";

/** 창 선택. 30일 코호트가 익기 전(2026-09-16 이전)에는 7·14 로 봐야 표본이 있다. */
const WINDOWS = [
  { value: "7", label: "7일 창" },
  { value: "14", label: "14일 창" },
  { value: "30", label: "30일 창" },
] as const;

/**
 * 최초 실행 후 창 안에서 **서로 다른 날짜로 며칠** 왔는가.
 *
 * 1일 = D0 에만 오고 다시 안 온 기기다. 이 막대가 대부분이면 유입은 되는데
 * 붙지 않는다는 뜻이라, 재방문율 한 숫자보다 형태가 더 많은 것을 말해준다.
 */
export function VisitDaysSection({
  days,
  group,
}: {
  days: number;
  group: RetentionGroup;
}) {
  const [win, setWin] = useState<"7" | "14" | "30">("7");
  const w = Number(win);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["analytics-visit-days", days, group, w],
    queryFn: () => unwrap(fetchVisitDaysDist(Math.max(days, 90), group, w)),
  });

  const total = data?.reduce((s, r) => s + r.devices, 0) ?? 0;
  const once = data?.find((r) => r.days === 1)?.share ?? null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-bds-heading3">방문일 수 분포</CardTitle>
            <p className="text-bds-caption2 text-bds-label-alternative">
              최초 실행일부터 창 안에서 <b>서로 다른 날짜로 며칠</b> 앱을 열었는지.
              1일 = D0 에만 오고 다시 오지 않은 기기.
            </p>
          </div>
          <div className="w-56">
            <SegmentedTab
              items={WINDOWS}
              value={win}
              onValueChange={(v) => setWin(v)}
              size="sm"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : isError ? (
          <QueryError
            section="방문일 수 분포"
            error={error}
            onRetry={() => void refetch()}
          />
        ) : !data?.length ? (
          <EmptyState
            message={`${w}일 창이 다 찬 기기가 아직 없습니다. 더 짧은 창으로 보세요.`}
          />
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-bds-caption1 text-bds-label-alternative">
              <span>
                대상 <b className="text-bds-label-normal">{total.toLocaleString()}</b>대
                <span className="text-bds-label-assistive"> (창이 다 찬 기기만)</span>
              </span>
              {once != null && (
                <span>
                  1일만 방문 <b className="text-bds-label-normal">{once}%</b>
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="days"
                  tick={AXIS_TICK}
                  tickLine={false}
                  label={{
                    value: "방문일 수",
                    position: "insideBottom",
                    offset: -2,
                    style: AXIS_TICK,
                  }}
                />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <Tooltip content={<DistTooltip />} />
                <Bar dataKey="devices" fill={SERIES_1} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-2 text-bds-caption2 text-bds-label-assistive">
              창이 다 찬 기기만 셉니다 — 아직 {w}일이 안 지난 기기를 넣으면 전부
              “1일 방문”으로 몰려 분포가 거짓이 됩니다.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DistTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: VisitDaysItem }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-bds-gray-200 bg-white px-3 py-2 text-bds-caption1 shadow-sm">
      <p className="text-bds-label-normal">{d.days}일 방문</p>
      <p className="text-bds-label-alternative">
        {d.devices.toLocaleString()}대 · {d.share}%
      </p>
    </div>
  );
}

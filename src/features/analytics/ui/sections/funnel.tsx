"use client";

import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, LabelList } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import type { ActionResult } from "@/src/shared/lib/action-result";
import type { FunnelStep } from "../../model/actions";
import { AXIS_TICK, SERIES_1 } from "../chart-tokens";
import { FunnelTable, FunnelTooltip } from "../primitives";

export function FunnelSection({
  title,
  description,
  queryKey,
  fetcher,
  days,
}: {
  title: string;
  description: string;
  queryKey: string;
  fetcher: () => Promise<ActionResult<FunnelStep[]>>;
  days: number;
}) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [queryKey, days],
    queryFn: () => unwrap(fetcher()),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">{title}</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">{description}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : isError ? (
          <QueryError error={error} onRetry={() => void refetch()} />
        ) : !data?.length || data.every((d) => d.users === 0) ? (
          <EmptyState message="아직 이벤트가 없습니다. 계측이 포함된 앱 배포 후부터 쌓입니다." />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 4, right: 48, bottom: 0, left: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-bds-gray-200)" horizontal={false} />
                <XAxis type="number" tick={AXIS_TICK} allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="stepName"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  width={104}
                />
                <Tooltip content={<FunnelTooltip />} />
                <Bar dataKey="users" fill={SERIES_1} radius={[0, 4, 4, 0]} barSize={22}>
                  <LabelList
                    dataKey="users"
                    position="right"
                    style={{ fontSize: 11, fill: "var(--color-bds-label-alternative)" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* 색만으로 읽히지 않도록 수치를 표로도 남긴다 */}
            <FunnelTable steps={data} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

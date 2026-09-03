"use client";

import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { fetchCumulativeTrend } from "../../api/actions";
import { SERIES_1, SERIES_2 } from "../chart-tokens";
import { CumulativeTile, CumulativeTooltip } from "../primitives";

export function CumulativeSection({ days }: { days: number }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["stats-cumulative", days],
    queryFn: () => unwrap(fetchCumulativeTrend(days)),
  });

  if (isError) {
    return (
      <QueryError
        section="누적 추이"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <CumulativeTile
          label="총 다운로드"
          total={data?.totalGuests ?? null}
          today={data?.guestsToday}
          dodPct={data?.guestsDodPct}
          loading={isLoading}
        />
        <CumulativeTile
          label="총 가입자"
          total={data?.totalSignups ?? null}
          today={data?.signupsToday}
          dodPct={data?.signupsDodPct}
          loading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-bds-heading3">누적 추이</CardTitle>
          <p className="text-bds-caption2 text-bds-label-alternative">
            전체 누계 기준 (all-time). 다운로드는 앱 첫 실행(디바이스 등록) 기준.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : !data?.series.length ? (
            <EmptyState message="데이터가 없습니다." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={data.series}
                margin={{ top: 8, right: 12, bottom: 0, left: -12 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-bds-gray-200)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--color-bds-label-assistive)" }}
                  tickFormatter={(v: string) => v.slice(5)}
                  tickLine={false}
                  axisLine={{ stroke: "var(--color-bds-gray-200)" }}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-bds-label-assistive)" }}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip content={<CumulativeTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line
                  type="monotone"
                  dataKey="cumGuests"
                  name="누적 다운로드"
                  stroke={SERIES_1}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="cumSignups"
                  name="누적 가입"
                  stroke={SERIES_2}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

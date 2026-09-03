"use client";

import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { fetchDailyAcquisition } from "../../api/actions";
import { SERIES_1, SERIES_2 } from "../chart-tokens";
import { AcquisitionTooltip, RatioTooltip, StatTile } from "../primitives";

export function AcquisitionSection({ days }: { days: number }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["stats-acquisition", days],
    queryFn: () => unwrap(fetchDailyAcquisition(days)),
  });

  const totalGuests = data?.reduce((s, d) => s + d.guests, 0) ?? 0;
  const totalSignups = data?.reduce((s, d) => s + d.signups, 0) ?? 0;
  const periodRatio =
    totalGuests > 0
      ? Math.round((totalSignups / totalGuests) * 1000) / 10
      : null;

  if (isError) {
    return (
      <QueryError section="유입" error={error} onRetry={() => void refetch()} />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <StatTile label="기간 내 다운로드" value={totalGuests} loading={isLoading} />
        <StatTile label="기간 내 가입" value={totalSignups} loading={isLoading} />
        <StatTile
          label="기간 합산 비율"
          value={periodRatio}
          suffix="%"
          loading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-bds-heading3">
            일자별 다운로드 · 가입
          </CardTitle>
          <p className="text-bds-caption2 text-bds-label-alternative">
            다운로드는 스토어 실다운로드가 아니라 앱 첫 실행(디바이스 등록)
            기준입니다. 날짜는 KST.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : !data?.length ? (
            <EmptyState message="데이터가 없습니다." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
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
                  width={44}
                />
                <Tooltip content={<AcquisitionTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line
                  type="monotone"
                  dataKey="guests"
                  name="다운로드"
                  stroke={SERIES_1}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="signups"
                  name="가입"
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

      {/* 비율은 단위(%)가 달라 같은 축에 겹치지 않고 별도 차트로 분리한다 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-bds-heading3">일별 비율</CardTitle>
          <p className="text-bds-caption2 text-bds-status-warning-text">
            ⚠ 코호트 전환율이 아닙니다. 디바이스와 가입 계정이 연결돼 있지 않아
            같은 사람을 추적할 수 없고, 설치일과 가입일이 다르면 분모·분자가
            다른 날에 잡힙니다. 유입이 급변한 날은 100%를 넘을 수 있습니다.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : !data?.length ? (
            <EmptyState message="데이터가 없습니다." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
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
                  tickFormatter={(v: number) => `${v}%`}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip content={<RatioTooltip />} />
                <Line
                  type="monotone"
                  dataKey="ratio"
                  name="비율"
                  stroke={SERIES_1}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

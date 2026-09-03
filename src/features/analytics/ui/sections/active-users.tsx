"use client";

import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { fetchActiveUsers } from "../../api/actions";
import { AXIS_TICK, SERIES_1, SERIES_2 } from "../chart-tokens";
import { StatTile } from "../primitives";

export function ActiveUsersSection({ days }: { days: number }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["analytics-active", days],
    queryFn: () => unwrap(fetchActiveUsers(days)),
  });
  const latest = data?.[data.length - 1];

  if (isError) {
    return (
      <QueryError
        section="활성 사용자"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* WAU/MAU 는 DAU 와 자릿수가 달라 한 축에 겹치면 DAU 가 눌린다 —
          추이는 DAU 만 선으로 보고, 주/월 활성은 최신값 타일로 읽는다. */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatTile label="DAU (오늘)" value={latest?.dau} sub={`회원 ${latest?.dauMember ?? "-"}`} loading={isLoading} />
        <StatTile label="WAU (7일)" value={latest?.wau} sub={`회원 ${latest?.wauMember ?? "-"}`} loading={isLoading} />
        <StatTile label="MAU (30일)" value={latest?.mau} sub={`회원 ${latest?.mauMember ?? "-"}`} loading={isLoading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-bds-heading3">일별 활성 사용자</CardTitle>
          <p className="text-bds-caption2 text-bds-label-alternative">
            기기 기준(비회원 포함)과 회원 기준을 함께 본다. 앱 실행 시 하루 1회 기록.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : !data?.length ? (
            <EmptyState message="아직 활성 기록이 없습니다. 계측이 포함된 앱 배포 후부터 쌓입니다." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-bds-gray-200)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={AXIS_TICK}
                  tickFormatter={(v: string) => v.slice(5)}
                  tickLine={false}
                  axisLine={{ stroke: "var(--color-bds-gray-200)" }}
                  minTickGap={24}
                />
                <YAxis tick={AXIS_TICK} allowDecimals={false} tickLine={false} axisLine={false} width={52} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line type="monotone" dataKey="dau" name="전체(기기)" stroke={SERIES_1} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
                <Line type="monotone" dataKey="dauMember" name="회원" stroke={SERIES_2} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

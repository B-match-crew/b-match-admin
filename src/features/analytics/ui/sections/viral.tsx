"use client";

import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, LabelList } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { fetchViralFunnel } from "../../api/actions";
import { AXIS_TICK, SERIES_1 } from "../chart-tokens";

export function ViralSection({ days }: { days: number }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["analytics-viral", days],
    queryFn: () => unwrap(fetchViralFunnel(days)),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">바이럴 퍼널</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">
          공유 → 웹 도달 → 앱 CTA → 미설치(스토어 이동). 건수 기준이며 유저 단위 추적이 아니다 —
          웹 방문자는 기기 식별자가 없다.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[240px] w-full" />
        ) : isError ? (
          <QueryError error={error} onRetry={() => void refetch()} />
        ) : !data?.length || data.every((d) => d.events === 0) ? (
          <EmptyState message="아직 공유 이벤트가 없습니다." />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, bottom: 0, left: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-bds-gray-200)" horizontal={false} />
              <XAxis type="number" tick={AXIS_TICK} allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="stepName" tick={AXIS_TICK} tickLine={false} axisLine={false} width={116} />
              <Tooltip />
              <Bar dataKey="events" name="건수" fill={SERIES_1} radius={[0, 4, 4, 0]} barSize={22}>
                <LabelList
                  dataKey="events"
                  position="right"
                  style={{ fontSize: 11, fill: "var(--color-bds-label-alternative)" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { fetchRegionDistribution } from "../../api/actions";
import { SERIES_1 } from "../chart-tokens";
import { RegionTooltip } from "../primitives";

export function RegionSection() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["stats-region"],
    queryFn: () => unwrap(fetchRegionDistribution()),
  });

  if (isError) {
    return (
      <QueryError
        section="지역별 분포"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">지역별 모임 분포</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : !data?.length ? (
          <EmptyState message="데이터가 없습니다." />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <ResponsiveContainer
              width="100%"
              height={Math.max(220, data.length * 32)}
            >
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 4, right: 44, bottom: 4, left: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="region"
                  tick={{ fontSize: 11, fill: "var(--color-bds-label-neutral)" }}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                />
                <Tooltip content={<RegionTooltip />} cursor={false} />
                <Bar
                  dataKey="matches"
                  fill={SERIES_1}
                  radius={[0, 4, 4, 0]}
                  barSize={16}
                >
                  <LabelList
                    dataKey="matches"
                    position="right"
                    style={{
                      fontSize: 11,
                      fill: "var(--color-bds-label-alternative)",
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <table className="w-full text-bds-caption2 self-start">
              <thead>
                <tr className="border-b border-bds-border-alternative text-bds-label-assistive">
                  <th className="py-1.5 text-left font-normal">지역</th>
                  <th className="py-1.5 text-right font-normal">모임</th>
                  <th className="py-1.5 text-right font-normal">모집중</th>
                  <th className="py-1.5 text-right font-normal">호스트</th>
                  <th className="py-1.5 text-right font-normal">비중</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr
                    key={r.region}
                    className="border-b border-bds-border-alternative"
                  >
                    <td className="py-1.5 text-bds-label-neutral">{r.region}</td>
                    <td className="py-1.5 text-right tabular-nums text-foreground">
                      {r.matches.toLocaleString()}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-bds-label-alternative">
                      {r.recruiting.toLocaleString()}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-bds-label-alternative">
                      {r.hosts.toLocaleString()}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-bds-label-alternative">
                      {r.share}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

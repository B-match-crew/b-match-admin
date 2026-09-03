"use client";

import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { fetchSupplyDemand } from "../../api/actions";
import { AXIS_TICK, SERIES_1 } from "../chart-tokens";

export function SupplyDemandSection({ days }: { days: number }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["analytics-supply-demand", days],
    queryFn: () => unwrap(fetchSupplyDemand(days)),
  });
  const chart = (data ?? []).filter((d) => d.demandPerSupply != null).slice(0, 12);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">지역별 수급 밸런스</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">
          공급 1건당 수요(조회). 높은 지역일수록 모집글이 부족하다 — 호스트 영업 1순위.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : isError ? (
          <QueryError error={error} onRetry={() => void refetch()} />
        ) : !chart.length ? (
          <EmptyState message="아직 조회·모집글 데이터가 없습니다." />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chart} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-bds-gray-200)" vertical={false} />
                <XAxis dataKey="region" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "var(--color-bds-gray-200)" }} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} />
                <Tooltip />
                <Bar dataKey="demandPerSupply" name="공급 1건당 수요" fill={SERIES_1} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-bds-caption1">
                <thead>
                  <tr className="text-bds-label-alternative">
                    <th className="py-2 text-left font-medium">지역</th>
                    <th className="py-2 text-right font-medium">공급(모집글)</th>
                    <th className="py-2 text-right font-medium">수요(조회)</th>
                    <th className="py-2 text-right font-medium">배율</th>
                  </tr>
                </thead>
                <tbody>
                  {(data ?? []).map((d) => (
                    <tr key={d.region} className="border-t border-bds-gray-100">
                      <td className="py-2 text-bds-label-normal">{d.region}</td>
                      <td className="py-2 text-right">{d.supply.toLocaleString()}</td>
                      <td className="py-2 text-right">{d.demand.toLocaleString()}</td>
                      <td className="py-2 text-right">
                        {d.demandPerSupply == null ? "공급 0" : `${d.demandPerSupply}×`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { fetchDemandGap } from "../../api/actions";

export function DemandGapSection({ days }: { days: number }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["analytics-demand-gap", days],
    queryFn: () => unwrap(fetchDemandGap(days)),
  });
  const top = (data ?? []).slice(0, 20);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">빈 결과 발생 지점</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">
          검색했는데 결과가 0건이었던 조합. 수요는 있는데 공급이 없는 자리라 마케팅 ROI 가 가장 높다.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : isError ? (
          <QueryError error={error} onRetry={() => void refetch()} />
        ) : !top.length ? (
          <EmptyState message="빈 결과 노출이 없습니다." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-bds-caption1">
              <thead>
                <tr className="text-bds-label-alternative">
                  <th className="py-2 text-left font-medium">지역</th>
                  <th className="py-2 text-left font-medium">요일</th>
                  <th className="py-2 text-left font-medium">급수</th>
                  <th className="py-2 text-right font-medium">빈 결과 노출</th>
                </tr>
              </thead>
              <tbody>
                {top.map((g, i) => (
                  <tr key={`${g.region}-${g.weekday}-${g.level}-${i}`} className="border-t border-bds-gray-100">
                    <td className="py-2 text-bds-label-normal">{g.region}</td>
                    <td className="py-2">{g.weekday}</td>
                    <td className="py-2">{g.level}</td>
                    <td className="py-2 text-right">{g.emptyViews.toLocaleString()}</td>
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

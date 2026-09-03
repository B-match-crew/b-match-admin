"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { fetchRetentionCohort } from "../../api/actions";
import { RetentionCell } from "../primitives";

export function RetentionSection({ days }: { days: number }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["analytics-cohort", days],
    queryFn: () => unwrap(fetchRetentionCohort(Math.max(days, 30))),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">코호트 리텐션</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">
          처음 앱을 연 주 기준. 셀 값은 그 코호트에서 D+N 일에 다시 온 비율.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : isError ? (
          <QueryError error={error} onRetry={() => void refetch()} />
        ) : !data?.length ? (
          <EmptyState message="아직 코호트를 만들 활성 기록이 없습니다." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-bds-caption1">
              <thead>
                <tr className="text-bds-label-alternative">
                  <th className="py-2 text-left font-medium">코호트 주</th>
                  <th className="py-2 text-right font-medium">인원</th>
                  <th className="py-2 text-center font-medium">D1</th>
                  <th className="py-2 text-center font-medium">D7</th>
                  <th className="py-2 text-center font-medium">D30</th>
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.week} className="border-t border-bds-gray-100">
                    <td className="py-2 text-bds-label-normal">{c.week}</td>
                    <td className="py-2 text-right">{c.size.toLocaleString()}</td>
                    <RetentionCell value={c.d1} />
                    <RetentionCell value={c.d7} />
                    <RetentionCell value={c.d30} />
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

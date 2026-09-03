"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { fetchMatchConversion } from "../../api/actions";

export function ConversionSection({ days }: { days: number }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["analytics-conversion", days],
    queryFn: () => unwrap(fetchMatchConversion(days)),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">매칭 전환율 (낮은 순)</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">
          조회 대비 연락률. 조회 10회 이상인 글만 — 3회 조회 1회 연락이 33%로 1위에 오르면 순위가 무의미해진다.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : isError ? (
          <QueryError error={error} onRetry={() => void refetch()} />
        ) : !data?.length ? (
          <EmptyState message="조회가 충분히 쌓인 모집글이 아직 없습니다." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-bds-caption1">
              <thead>
                <tr className="text-bds-label-alternative">
                  <th className="py-2 text-left font-medium">모집글</th>
                  <th className="py-2 text-left font-medium">지역</th>
                  <th className="py-2 text-right font-medium">조회</th>
                  <th className="py-2 text-right font-medium">연락</th>
                  <th className="py-2 text-right font-medium">전환율</th>
                </tr>
              </thead>
              <tbody>
                {data.map((m) => (
                  <tr key={m.matchId} className="border-t border-bds-gray-100">
                    <td className="py-2 text-bds-label-normal">{m.title}</td>
                    <td className="py-2">{m.region}</td>
                    <td className="py-2 text-right">{m.views.toLocaleString()}</td>
                    <td className="py-2 text-right">{m.contacts.toLocaleString()}</td>
                    <td className="py-2 text-right">
                      {m.conversion == null ? "-" : `${m.conversion}%`}
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

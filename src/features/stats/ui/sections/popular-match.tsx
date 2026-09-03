"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { Badge } from "@/src/shared/ui/kit/badge";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { fetchPopularMatches } from "../../api/actions";

export function PopularMatchSection() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["stats-popular"],
    queryFn: () => unwrap(fetchPopularMatches(10)),
  });

  if (isError) {
    return (
      <QueryError
        section="인기 매칭"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">인기 매칭</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">
          찜 수 기준 상위 10개 (동률 시 조회수).
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : !data?.length ? (
          <EmptyState message="데이터가 없습니다." />
        ) : (
          <table className="w-full text-bds-caption2">
            <thead>
              <tr className="border-b border-bds-border-alternative text-bds-label-assistive">
                <th className="py-1.5 text-left font-normal">#</th>
                <th className="py-1.5 text-left font-normal">제목</th>
                <th className="py-1.5 text-left font-normal">지역</th>
                <th className="py-1.5 text-right font-normal">찜</th>
                <th className="py-1.5 text-right font-normal">조회</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m, i) => (
                <tr
                  key={m.id}
                  className="border-b border-bds-border-alternative"
                >
                  <td className="py-1.5 font-mono text-[11px] text-bds-label-assistive">
                    {i + 1}
                  </td>
                  <td className="py-1.5 max-w-xs truncate text-foreground">
                    {m.title}
                  </td>
                  <td className="py-1.5">
                    {m.region_1 ? (
                      <Badge variant="outline">{m.region_1}</Badge>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-1.5 text-right tabular-nums font-medium text-foreground">
                    {m.favorite_count.toLocaleString()}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-bds-label-alternative">
                    {m.view_count.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

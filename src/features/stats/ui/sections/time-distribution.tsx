"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { fetchMatchTimeDistribution } from "../../api/actions";
import { DOW_LABEL } from "../chart-tokens";

export function TimeDistributionSection() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["stats-time-dist"],
    queryFn: () => unwrap(fetchMatchTimeDistribution()),
  });

  if (isError) {
    return (
      <QueryError
        section="시간대 분포"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  // dow × hour 그리드로 펼치고 최대값으로 정규화(색 농도)
  const grid = new Map<string, number>();
  let max = 0;
  for (const c of data ?? []) {
    grid.set(`${c.dow}-${c.hour}`, c.cnt);
    if (c.cnt > max) max = c.cnt;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">매칭 시간대 분포</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">
          모임 시작 시각 기준 (KST). 색이 진할수록 그 요일·시간에 모임이 많습니다.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : !data?.length ? (
          <EmptyState message="데이터가 없습니다." />
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              {/* 시간 헤더 */}
              <div className="flex">
                <div className="w-8 shrink-0" />
                {Array.from({ length: 24 }).map((_, h) => (
                  <div
                    key={h}
                    className="flex-1 text-center text-[9px] text-bds-label-assistive"
                  >
                    {h % 3 === 0 ? h : ""}
                  </div>
                ))}
              </div>
              {DOW_LABEL.map((label, dow) => (
                <div key={dow} className="flex items-center">
                  <div className="w-8 shrink-0 text-bds-caption2 text-bds-label-neutral">
                    {label}
                  </div>
                  {Array.from({ length: 24 }).map((_, h) => {
                    const cnt = grid.get(`${dow}-${h}`) ?? 0;
                    const ratio = max > 0 ? cnt / max : 0;
                    return (
                      <div key={h} className="flex-1 p-[1px]">
                        <div
                          className="aspect-square rounded-[2px]"
                          title={`${label} ${h}시 · ${cnt}건`}
                          style={{
                            background:
                              cnt === 0
                                ? "var(--color-bds-back-strong)"
                                : `color-mix(in srgb, var(--color-series-1) ${Math.round(
                                    20 + ratio * 80
                                  )}%, transparent)`,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import type { RetentionGroup } from "../../model/actions";
import { fetchRevisitCohort } from "../../api/actions";
import { RetentionCell } from "../primitives";

/**
 * N일 **이내에 한 번이라도** 다시 온 비율.
 *
 * 예전엔 바로 위에 38 의 "코호트 리텐션"(정확히 D+N **그날** 온 비율)이 있었다.
 * 정의가 달라 같은 데이터에서 다른 수가 나왔고 오독이 잦아 2026-09-07 에 내렸다 —
 * 이제 리텐션은 이 표(N일 안에 한 번이라도, 누적) 하나로 본다.
 */
export function RevisitSection({
  days,
  group,
}: {
  days: number;
  group: RetentionGroup;
}) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["analytics-revisit", days, group],
    queryFn: () => unwrap(fetchRevisitCohort(Math.max(days, 90), group)),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">재방문율 (누적)</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">
          최초 실행일(D0) 이후 <b>N일 안에 다른 날짜로 한 번이라도</b> 다시 온
          기기 비율. D0 당일 여러 번 실행은 재방문이 아니다.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : isError ? (
          <QueryError section="재방문율" error={error} onRetry={() => void refetch()} />
        ) : !data?.length ? (
          <EmptyState message="아직 코호트를 만들 활성 기록이 없습니다." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-bds-caption1">
                <thead>
                  <tr className="text-bds-label-alternative">
                    <th className="py-2 text-left font-medium">코호트 주</th>
                    <th className="py-2 text-right font-medium">신규 기기</th>
                    <th className="py-2 text-center font-medium">7일 내</th>
                    <th className="py-2 text-center font-medium">14일 내</th>
                    <th className="py-2 text-center font-medium">30일 내</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((c) => (
                    <tr key={c.week} className="border-t border-bds-gray-100">
                      <td className="py-2 text-bds-label-normal">{c.week}</td>
                      <td className="py-2 text-right">{c.size.toLocaleString()}</td>
                      <MatureCell value={c.d7} mature={c.mature7} />
                      <MatureCell value={c.d14} mature={c.mature14} />
                      <MatureCell value={c.d30} mature={c.mature30} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-bds-caption2 text-bds-label-assistive">
              “집계 중”은 0% 가 아니라 <b>아직 N일이 지나지 않아 판정할 수 없다</b>는
              뜻입니다. 분모(창이 다 찬 기기 수)는 칸에 마우스를 올리면 보입니다.
              활성 기록은 2026-08-06(v1.0.8)부터 쌓여, 30일 칸은 2026-09-16 경부터
              채워집니다.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 분모가 0 이면 "집계 중" 으로 그린다.
 *
 * 🔴 0% 로 그리면 최근 코호트가 전부 "아무도 안 돌아왔다" 로 보인다 —
 * 실제로는 아직 시간이 안 갔을 뿐이다. 이 구분이 이 표의 핵심이다.
 */
function MatureCell({ value, mature }: { value: number | null; mature: number }) {
  if (value == null) {
    return (
      <td className="py-2 text-center text-bds-label-assistive" title="창이 다 찬 기기 0대">
        집계 중
      </td>
    );
  }
  return (
    <td title={`분모 ${mature.toLocaleString()}대`} className="p-0">
      <table className="w-full">
        <tbody>
          <tr>
            <RetentionCell value={value} />
          </tr>
        </tbody>
      </table>
    </td>
  );
}

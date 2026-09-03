"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { fetchClubContactConversion } from "../../api/actions";

export function ConversionSection({ days }: { days: number }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["analytics-club-conversion", days],
    queryFn: () => unwrap(fetchClubContactConversion(days)),
  });

  // 아직 판정하기 이른 글이 얼마나 섞여 있는지 — 낮은 전환율이 "연락이 안 온다"
  // 가 아니라 "아직 이르다" 일 수 있다는 것을 표 아래에서 한 번 말해 준다.
  const recentTotal = data?.reduce((sum, c) => sum + c.recentMatches, 0) ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">
          모임별 연락 전환율 (낮은 순)
        </CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">
          기간 내 올라온 모집글 중 <b>연락을 한 건이라도 받은 글의 비율</b>. 글이
          3개 이상인 모임만 — 글 하나로 0%·100%가 되면 순위가 무의미해진다.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : isError ? (
          <QueryError error={error} onRetry={() => void refetch()} />
        ) : !data?.length ? (
          <EmptyState message="모집글이 충분히 쌓인 모임이 아직 없습니다." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-bds-caption1">
                <thead>
                  <tr className="text-bds-label-alternative">
                    <th className="py-2 text-left font-medium">모임</th>
                    <th className="py-2 text-right font-medium">모집글</th>
                    <th className="py-2 text-right font-medium">연락 받은 글</th>
                    <th className="py-2 text-right font-medium">전환율</th>
                    <th className="py-2 text-right font-medium">총 연락</th>
                    <th className="py-2 text-right font-medium">조회</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((c) => (
                    <tr key={c.hostId} className="border-t border-bds-gray-100">
                      <td className="py-2 text-bds-label-normal">
                        {c.clubName ?? c.nickname ?? `#${c.hostId}`}
                        {c.recentMatches > 0 && (
                          <span className="ml-1.5 text-bds-caption2 text-bds-label-alternative">
                            (최근 {c.recentMatches}글)
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right">{c.matches.toLocaleString()}</td>
                      <td className="py-2 text-right">
                        {c.contactedMatches.toLocaleString()}
                      </td>
                      <td className="py-2 text-right">
                        {c.conversion == null ? "-" : `${c.conversion}%`}
                      </td>
                      <td className="py-2 text-right">{c.contacts.toLocaleString()}</td>
                      <td className="py-2 text-right">{c.views.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-bds-caption2 text-bds-label-alternative">
              전환율은 <b>연락 건수가 아니라 글 기준</b>입니다. 인기 글 하나에 연락이
              몰려도 나머지 글이 헛돌면 낮게 나옵니다 — 총 연락 열과 함께 보세요.
              {recentTotal > 0 && (
                <>
                  {" "}괄호 안 숫자는 최근 3일 내 등록분으로,{" "}
                  <b>아직 연락받을 시간이 충분하지 않은 글</b>입니다.
                </>
              )}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

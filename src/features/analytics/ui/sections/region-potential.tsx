"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import type { RegionPotentialItem } from "../../model/actions";
import { fetchRegionPotential } from "../../api/actions";

/**
 * 기획자의 "관측 결과 → 다음 행동" 표를 행마다 판정한다. 임계값은 운영 결정이라
 * 여기 한 곳에 두고 바꾼다.
 */
function verdict(r: RegionPotentialItem): { label: string; tone: "warn" | "ok" | "neutral" } {
  if (r.searchers >= 10 && (r.emptyRate ?? 0) >= 40) return { label: "🔴 검색은 많은데 결과가 자주 없음 → 모임장 확보", tone: "warn" };
  if (r.listings >= 5 && r.searchers < 10) return { label: "🟠 공급은 있는데 조회가 적음 → 게스트 유입 실험", tone: "warn" };
  if (r.listings >= 5 && (r.inquiryRate ?? 0) < 15) return { label: "🟠 조회는 있는데 문의가 적음 → 급수·참가비·일정 점검", tone: "warn" };
  if (r.listings === 0 && r.searchers > 0) return { label: "🔴 공급 0 — 검색만 있음", tone: "warn" };
  if (r.listings > 0 && r.searchers > 0) return { label: "✅", tone: "ok" };
  return { label: "—", tone: "neutral" };
}

export function RegionPotentialSection({ days }: { days: number }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["analytics-region-potential", days],
    queryFn: () => unwrap(fetchRegionPotential(days)),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">지역별 매칭 가능성</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">
          공급은 <b>운동 예정일</b>이 기간 안인 모집글·고유 모임 수, 수요는 <b>검색한 기기</b>와
          빈 결과율, 성과는 실제 문의를 받은 글 비율.
        </p>
        <p className="text-bds-caption2 text-bds-status-warning-text">
          ⚠️ 위 “수급 밸런스”는 글 생성일·상세 조회수라 <b>볼 글이 없는 지역의 수요가 0 으로</b>
          보입니다(부산). 이 표는 검색 자체를 세므로 그 지역이 드러납니다.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : isError ? (
          <QueryError section="지역별 매칭 가능성" error={error} onRetry={() => void refetch()} />
        ) : !data?.length ? (
          <EmptyState message="기간 안에 검색·모집글이 없습니다." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-bds-caption1">
              <thead>
                <tr className="text-bds-label-alternative">
                  <th className="py-2 text-left font-medium">지역</th>
                  <th className="py-2 text-right font-medium">모집글</th>
                  <th className="py-2 text-right font-medium">모임</th>
                  <th className="py-2 text-right font-medium">검색 기기</th>
                  <th className="py-2 text-right font-medium">빈 결과율</th>
                  <th className="py-2 text-right font-medium">문의받은 글</th>
                  <th className="py-2 text-right font-medium">글/기기</th>
                  <th className="py-2 text-left font-medium">판정</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => {
                  const v = verdict(r);
                  return (
                    <tr key={r.region} className="border-t border-bds-gray-100">
                      <td className="py-2 text-bds-label-normal">{r.region}</td>
                      <td className="py-2 text-right">{r.listings.toLocaleString()}</td>
                      <td className="py-2 text-right text-bds-label-alternative">{r.hosts.toLocaleString()}</td>
                      <td className="py-2 text-right">{r.searchers.toLocaleString()}</td>
                      <td className={`py-2 text-right ${(r.emptyRate ?? 0) >= 40 ? "font-medium text-bds-status-error-text" : ""}`}>
                        {r.emptyRate == null ? "—" : `${r.emptyRate}%`}
                      </td>
                      <td className="py-2 text-right">{r.inquiryRate == null ? "—" : `${r.inquiryRate}%`}</td>
                      <td className="py-2 text-right text-bds-label-alternative">{r.listingsPerSearcher == null ? "—" : r.listingsPerSearcher}</td>
                      <td className={`py-2 text-bds-caption2 ${v.tone === "warn" ? "text-bds-status-warning-text" : "text-bds-label-assistive"}`}>{v.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-bds-caption2 text-bds-label-assistive">
          “(복수 선택)”은 여러 시·도를 함께 고른 검색 — 어느 지역인지 알 수 없습니다. 시·군·구는 앱 필터에
          없어 시·도까지만 봅니다.
        </p>
      </CardContent>
    </Card>
  );
}

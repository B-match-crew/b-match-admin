"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import type { RetentionGroup, Experience } from "../../model/actions";
import { fetchRevisitByExperience, fetchRevisitByFirstSearch } from "../../api/actions";
import { RetentionCell } from "../primitives";

const EXP_LABEL: Record<Experience, string> = {
  replied: "문의 → 응답받음",
  inquired_no_reply: "문의 → 응답 없음",
  favorited: "찜까지",
  viewed_only: "상세만",
  list_only: "목록만",
};

const FS_LABEL: Record<"empty" | "had_results" | "no_search", string> = {
  empty: "빈 결과",
  had_results: "결과 있음",
  no_search: "검색 없음 (딥링크 등)",
};

/** 첫 경험 × 재방문 (112). 🔴 인과가 아니라 가설이다 — 화면에 그대로 적는다. */
export function RevisitExperienceSection({ days, group }: { days: number; group: RetentionGroup }) {
  const exp = useQuery({
    queryKey: ["analytics-revisit-exp", days, group],
    queryFn: () => unwrap(fetchRevisitByExperience(Math.max(days, 90), group)),
  });
  const fs = useQuery({
    queryKey: ["analytics-revisit-first-search", days, group],
    queryFn: () => unwrap(fetchRevisitByFirstSearch(Math.max(days, 90), group)),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">어떤 경험 뒤에 돌아오는가</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">
          첫 7일의 경험으로 기기를 나누고 <b>8~30일</b> 재방문을 비교합니다. 높은 단이 이깁니다(문의하고
          응답받았으면 찜 여부는 안 봄).
        </p>
        <p className="text-bds-caption2 text-bds-status-warning-text">
          ⚠️ 인과가 아닙니다. 원래 의지가 강한 사람이 더 많이 문의했을 수 있습니다. <b>실험할 가설</b>로만
          쓰세요.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          {exp.isLoading ? (
            <Skeleton className="h-[180px] w-full" />
          ) : exp.isError ? (
            <QueryError section="경험별 재방문" error={exp.error} onRetry={() => void exp.refetch()} />
          ) : !exp.data?.length ? (
            <EmptyState message="30일 창이 다 찬 기기가 아직 없습니다 (2026-09-16 경부터)." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-bds-caption1">
                <thead>
                  <tr className="text-bds-label-alternative">
                    <th className="py-2 text-left font-medium">첫 7일 경험</th>
                    <th className="py-2 text-right font-medium">기기</th>
                    <th className="py-2 text-right font-medium">8~30일 재방문</th>
                    <th className="py-2 text-center font-medium">비율</th>
                  </tr>
                </thead>
                <tbody>
                  {exp.data.map((r) => (
                    <tr key={r.experience} className="border-t border-bds-gray-100">
                      <td className="py-2 text-bds-label-normal">{EXP_LABEL[r.experience]}</td>
                      <td className="py-2 text-right">{r.devices.toLocaleString()}</td>
                      <td className="py-2 text-right">{r.revisited830.toLocaleString()}</td>
                      <RetentionCell value={r.rate} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-bds-body2 text-bds-label-normal">첫 검색이 빈 결과였는가 × 7일 재방문</p>
          {fs.isLoading ? (
            <Skeleton className="h-[120px] w-full" />
          ) : fs.isError ? (
            <QueryError section="첫 검색별 재방문" error={fs.error} onRetry={() => void fs.refetch()} />
          ) : !fs.data?.length ? (
            <EmptyState message="7일 창이 다 찬 기기가 아직 없습니다." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-bds-caption1">
                <thead>
                  <tr className="text-bds-label-alternative">
                    <th className="py-2 text-left font-medium">D0 첫 검색</th>
                    <th className="py-2 text-right font-medium">기기</th>
                    <th className="py-2 text-right font-medium">7일 재방문</th>
                    <th className="py-2 text-center font-medium">비율</th>
                  </tr>
                </thead>
                <tbody>
                  {fs.data.map((r) => (
                    <tr key={r.firstSearch} className="border-t border-bds-gray-100">
                      <td className="py-2 text-bds-label-normal">{FS_LABEL[r.firstSearch]}</td>
                      <td className="py-2 text-right">{r.devices.toLocaleString()}</td>
                      <td className="py-2 text-right">{r.revisited7.toLocaleString()}</td>
                      <RetentionCell value={r.rate} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-bds-caption2 text-bds-label-assistive">
            “빈 결과”와 “결과 있음”의 차이가 <b>공급 공백이 리텐션을 깎는 크기</b>입니다 — 부산 빈 결과 411건의
            비용이 여기서 숫자가 됩니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

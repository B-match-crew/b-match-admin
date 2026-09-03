import { HydrationBoundary } from "@tanstack/react-query";

import { PageHeader } from "@/src/shared/ui/page-header";
import { prefetchAll } from "@/src/shared/api/prefetch";
import { StatsClient, statsPageQueries } from "@/src/features/stats";

export const metadata = { title: "통계" };

/**
 * 조회 10개를 서버에서 한 번에 채워 넘긴다.
 *
 * 클라이언트가 각각 서버 액션으로 부르면 요청이 10개고, 액션마다 인가를 다시
 * 하므로 왕복이 30회가 된다. 한 요청에 모으면 인가 1회 + 쿼리 10회다.
 * 자세한 계산은 shared/api/prefetch.ts 주석 참조.
 */
export default async function StatsPage() {
  const state = await prefetchAll(statsPageQueries());

  return (
    <div className="space-y-6">
      <PageHeader
        title="통계"
        description="유입·전환·유저 구성·지역 분포를 확인합니다 (ADM-06)"
      />
      <HydrationBoundary state={state}>
        <StatsClient />
      </HydrationBoundary>
    </div>
  );
}

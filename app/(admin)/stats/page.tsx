import { PageHeader } from "@/src/shared/ui/page-header";
import { StatsClient } from "@/src/features/stats/ui/stats-client";

export const metadata = { title: "통계" };

export default function StatsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="통계"
        description="유입·전환·유저 구성·지역 분포를 확인합니다 (ADM-06)"
      />
      <StatsClient />
    </div>
  );
}

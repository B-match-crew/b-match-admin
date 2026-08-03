import { PageHeader } from "@/src/shared/ui/page-header";
import { AnalyticsClient } from "@/src/features/analytics/ui/analytics-client";

export const metadata = { title: "분석" };

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="분석"
        description="행동 퍼널·리텐션·수급 갭을 확인합니다. 통계(현재 상태)와 달리 사용자의 행동 흐름을 봅니다."
      />
      <AnalyticsClient />
    </div>
  );
}

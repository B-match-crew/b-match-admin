import { PageHeader } from "@/src/shared/ui/page-header";
import { StatsGrid } from "@/src/features/dashboard/ui/stats-grid";
import { RecentActivity } from "@/src/features/dashboard/ui/recent-activity";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="대시보드"
        description="B-Match 서비스 주요 지표를 한눈에 확인하세요"
      />
      <StatsGrid />
      <RecentActivity />
    </div>
  );
}

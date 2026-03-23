import { PageHeader } from "@/src/shared/ui/page-header";
import { StatsGrid } from "@/src/features/dashboard/ui/stats-grid";
import { RecentActivity } from "@/src/features/dashboard/ui/recent-activity";
import { RiskAlertWidget } from "@/src/features/dashboard/ui/risk-alert-widget";
import { FinanceHealthWidget } from "@/src/features/dashboard/ui/finance-health-widget";
import { ActiveMatchesWidget } from "@/src/features/dashboard/ui/active-matches-widget";
import { RecentReportsWidget } from "@/src/features/dashboard/ui/recent-reports-widget";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="대시보드"
        description="B-Match 서비스 주요 지표를 한눈에 확인하세요"
      />
      <StatsGrid />
      <div className="grid gap-4 lg:grid-cols-2">
        <RiskAlertWidget />
        <FinanceHealthWidget />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ActiveMatchesWidget />
        <RecentReportsWidget />
      </div>
      <RecentActivity />
    </div>
  );
}

import { PageHeader } from "@/src/shared/ui/page-header";
import { DashboardClient } from "@/src/features/dashboard";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="대시보드"
        description="B-Match 운영 핵심 지표 (ADM-01)"
      />
      <DashboardClient />
    </div>
  );
}

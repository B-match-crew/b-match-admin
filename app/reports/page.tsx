import { PageHeader } from "@/src/shared/ui/page-header";
import { ReportsClient } from "@/src/features/reports/ui/reports-client";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="신고 관리"
        description="유저 신고를 검토하고 제재/반려를 처리합니다 (ADM-04)"
      />
      <ReportsClient />
    </div>
  );
}

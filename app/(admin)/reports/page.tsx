import { PageHeader } from "@/src/shared/ui/page-header";
import { ReportsClient } from "@/src/features/reports";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="신고 관리"
        description="신고된 매칭글을 검토하고 삭제·반려·호스트 제재를 처리합니다 (App Store 1.2 / UGC)"
      />
      <ReportsClient />
    </div>
  );
}

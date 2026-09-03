import { PageHeader } from "@/src/shared/ui/page-header";
import { ComplianceClient } from "@/src/features/compliance";

export const metadata = { title: "동의·파기" };

export default function CompliancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="동의·파기"
        description="약관·광고성 수신 동의 이력과 개인정보 파기 대기 현황을 확인합니다."
      />
      <ComplianceClient />
    </div>
  );
}

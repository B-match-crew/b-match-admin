import { PageHeader } from "@/src/shared/ui/page-header";
import { AdReportClient } from "@/src/features/ad-report";

export const metadata = { title: "광고 리포트" };

export default function AdReportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="광고 리포트"
        description="앱 홈 상단 배너의 노출을 기간별로 봅니다. 광고주에게 보낼 일별 추이와 CSV 를 뽑는 화면입니다."
      />
      <AdReportClient />
    </div>
  );
}

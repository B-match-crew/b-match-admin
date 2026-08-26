import { PageHeader } from "@/src/shared/ui/page-header";
import { OpsClient } from "@/src/features/ops/ui/ops-client";

export const metadata = { title: "운영 상태" };

export default function OpsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="운영 상태"
        description="크론 실행 결과와 수집 중인 앱 이벤트를 확인합니다. 조용히 멈춘 것을 찾는 화면입니다."
      />
      <OpsClient />
    </div>
  );
}

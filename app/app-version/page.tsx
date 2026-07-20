import { PageHeader } from "@/src/shared/ui/page-header";
import { AppVersionClient } from "@/src/features/app-version/ui/app-version-client";

export default function AppVersionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="버전 관리"
        description="플랫폼별 권장/강제 업데이트 버전을 설정합니다. 앱은 스플래시에서 이 값을 읽어 업데이트 팝업을 띄웁니다."
      />
      <AppVersionClient />
    </div>
  );
}

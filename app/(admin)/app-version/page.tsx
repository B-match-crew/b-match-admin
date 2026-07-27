import { PageHeader } from "@/src/shared/ui/page-header";
import { AppVersionClient } from "@/src/features/app-version/ui/app-version-client";
import { MaintenanceClient } from "@/src/features/app-version/ui/maintenance-client";

export default function AppVersionPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="앱 관리"
        description="서버 점검 모드와 플랫폼별 업데이트 정책을 설정합니다. 앱은 스플래시(및 포그라운드 복귀·주기 폴링)에서 이 값을 읽어 점검 → 업데이트 순으로 판정합니다."
      />
      <MaintenanceClient />
      <AppVersionClient />
    </div>
  );
}

import { PageHeader } from "@/src/shared/ui/page-header";
import { BlocksClient } from "@/src/features/blocks/ui/blocks-client";

export const metadata = { title: "차단 관리" };

export default function BlocksPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="차단 관리"
        description="유저간 차단 현황과 영구 차단 목록을 확인합니다."
      />
      <BlocksClient />
    </div>
  );
}

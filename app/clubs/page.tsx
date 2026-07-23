import { PageHeader } from "@/src/shared/ui/page-header";
import { ClubsClient } from "@/src/features/clubs/ui/clubs-client";

export const metadata = { title: "모임 관리" };

export default function ClubsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="모임 관리"
        description="개설된 모임(클럽)을 조회합니다. 매칭은 모임이 올리는 개별 모집글입니다."
      />
      <ClubsClient />
    </div>
  );
}

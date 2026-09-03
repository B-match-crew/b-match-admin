import { PageHeader } from "@/src/shared/ui/page-header";
import { DeletionReasonsClient } from "@/src/features/deletion-reasons";

export const metadata = { title: "탈퇴 사유" };

export default function DeletionReasonsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="탈퇴 사유"
        description="탈퇴할 때 남긴 사유를 익명으로 모아 봅니다. 누가 썼는지는 저장하지 않고, 모임장이었는지만 함께 둡니다."
      />
      <DeletionReasonsClient />
    </div>
  );
}

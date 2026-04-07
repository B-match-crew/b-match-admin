import { PageHeader } from "@/src/shared/ui/page-header";
import { PushClient } from "@/src/features/push/ui/push-client";

export default function PushPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="푸시 발송"
        description="ADMIN_NOTICE 푸시를 작성·발송합니다 (ADM-05)"
      />
      <PushClient />
    </div>
  );
}

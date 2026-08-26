import { PageHeader } from "@/src/shared/ui/page-header";
import { NotificationsClient } from "@/src/features/notifications/ui/notifications-client";

export const metadata = { title: "알림 발송" };

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="알림 발송"
        description="푸시 발송 결과와 실패 사유, 도달 가능 수, 알림 카테고리를 관리합니다."
      />
      <NotificationsClient />
    </div>
  );
}

import { PageHeader } from "@/src/shared/ui/page-header";
import { NoticeBroadcastClient } from "@/src/features/notices";

export default function NoticesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="공지 발송"
        description="대상 회원 전원에게 시스템 알림(푸시)을 보냅니다. 수신 설정을 무시하고 도달하며 되돌릴 수 없으므로, 발송 대상 수를 확인한 뒤 2단계 확인을 거칩니다."
      />
      <NoticeBroadcastClient />
    </div>
  );
}

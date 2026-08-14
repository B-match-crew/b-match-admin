import { PageHeader } from "@/src/shared/ui/page-header";
import { ChatReportsClient } from "@/src/features/chat-reports/ui/chat-reports-client";

export default function ChatReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="채팅 신고"
        description="인앱 채팅에서 접수된 신고를 대화 증적과 함께 검토하고 정지·차단을 처리합니다 (App Store 1.2 / UGC)"
      />
      <ChatReportsClient />
    </div>
  );
}

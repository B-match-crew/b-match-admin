import { PageHeader } from "@/src/shared/ui/page-header";
import { PaymentsClient } from "@/src/features/payments";

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="결제"
        description="페이플 결제 운영 큐 · 목록 · 상세, 상태 재조회 · 강제 환불 · 킬 스위치 (app migration 136 · 137)"
      />
      <PaymentsClient />
    </div>
  );
}

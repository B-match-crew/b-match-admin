import { PageHeader } from "@/src/shared/ui/page-header";
import { PayoutsClient } from "@/src/features/payouts";

export default function PayoutsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="정산"
        description="페이플 정산지급대행 — 정책(임시 기본값 표시) · 지급 상태 · 잔액 · 회차 만들기 · 승인 · 보류 · 재시도 (app migration 138)"
      />
      <PayoutsClient />
    </div>
  );
}

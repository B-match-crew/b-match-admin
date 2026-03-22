"use client";

import { PageHeader } from "@/src/shared/ui/page-header";

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="재무 대시보드"
        description="거래액, 환불액, 미정산액 등 재무 지표를 확인합니다"
      />
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        재무 대시보드 기능 준비 중
      </div>
    </div>
  );
}

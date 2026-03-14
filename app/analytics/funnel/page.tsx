"use client";

import { PageHeader } from "@/src/shared/ui/page-header";
import { FunnelChart } from "@/src/features/analytics/ui/funnel-chart";

export default function FunnelPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="퍼널 분석"
        description="가입부터 입금까지 각 단계의 전환율을 분석합니다"
      />
      <FunnelChart />
    </div>
  );
}

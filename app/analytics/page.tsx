"use client";

import { PageHeader } from "@/src/shared/ui/page-header";
import { EventTrackingTable } from "@/src/features/analytics/ui/event-tracking-table";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="GA4 이벤트 분석"
        description="앱 내 이벤트 발생 현황을 확인합니다"
      />
      <EventTrackingTable />
    </div>
  );
}

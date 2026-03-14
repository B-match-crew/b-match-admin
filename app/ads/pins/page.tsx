"use client";

import { PageHeader } from "@/src/shared/ui/page-header";
import { PinAdTable } from "@/src/features/ad-management/ui/pin-ad-table";

export default function PinAdsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="지도 핀 광고"
        description="지도 핀 광고 목록을 확인하고 관리합니다"
      />
      <PinAdTable />
    </div>
  );
}

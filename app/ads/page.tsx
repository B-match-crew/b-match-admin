"use client";

import { PageHeader } from "@/src/shared/ui/page-header";
import { BannerAdTable } from "@/src/features/ad-management/ui/banner-ad-table";

export default function BannerAdsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="배너 광고 관리"
        description="배너 광고 목록을 확인하고 관리합니다"
      />
      <BannerAdTable />
    </div>
  );
}

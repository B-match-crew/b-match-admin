"use client";

import { PageHeader } from "@/src/shared/ui/page-header";
import { AdReviewPanel } from "@/src/features/ad-management/ui/ad-review-panel";

export default function AdReviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="소재 승인"
        description="검수 대기 중인 광고 소재를 승인하거나 반려합니다"
      />
      <AdReviewPanel />
    </div>
  );
}

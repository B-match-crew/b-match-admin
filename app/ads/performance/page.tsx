"use client";

import { PageHeader } from "@/src/shared/ui/page-header";
import { AdPerformanceChart } from "@/src/features/ad-management/ui/ad-performance-chart";
import { CsvExportButton } from "@/src/features/ad-management/ui/csv-export-button";

export default function AdPerformancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="광고 성과"
        description="광고별 클릭 및 노출 성과를 분석합니다"
        actions={<CsvExportButton />}
      />
      <AdPerformanceChart />
    </div>
  );
}

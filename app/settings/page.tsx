"use client";

import { ConfigTable } from "@/src/features/settings/ui/config-table";
import { SystemStatus } from "@/src/features/settings/ui/system-status";
import { PageHeader } from "@/src/shared/ui/page-header";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="설정"
        description="시스템 설정 및 관리자 계정을 관리합니다"
      />

      <SystemStatus />

      <Separator />

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">앱 설정 (app_config)</h3>
        <ConfigTable />
      </div>
    </div>
  );
}

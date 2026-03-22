"use client";

import { PageHeader } from "@/src/shared/ui/page-header";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="설정"
        description="시스템 설정 및 관리자 계정을 관리합니다"
      />
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        설정 기능 준비 중
      </div>
    </div>
  );
}

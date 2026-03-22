"use client";

import { PageHeader } from "@/src/shared/ui/page-header";

export default function SettlementsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="정산 관리"
        description="호스트 정산 요청을 확인하고 승인/거절합니다"
      />
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        정산 관리 기능 준비 중
      </div>
    </div>
  );
}

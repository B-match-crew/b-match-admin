"use client";

import { PageHeader } from "@/src/shared/ui/page-header";

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="감사 로그"
        description="관리자 행위 이력을 조회합니다"
      />
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        감사 로그 기능 준비 중
      </div>
    </div>
  );
}

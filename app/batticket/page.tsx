"use client";

import { PageHeader } from "@/src/shared/ui/page-header";

export default function BatticketPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="배티켓 관리"
        description="사용자별 배티켓 점수와 이벤트 이력을 관리합니다"
      />
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        배티켓 관리 기능 준비 중
      </div>
    </div>
  );
}

"use client";

import { BatticketUserTable } from "@/src/features/batticket/ui/batticket-user-table";
import { BatticketEventPanel } from "@/src/features/batticket/ui/batticket-event-panel";
import { PageHeader } from "@/src/shared/ui/page-header";

export default function BatticketPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="배티켓 관리"
        description="사용자별 배티켓 점수와 이벤트 이력을 관리합니다"
      />
      <BatticketUserTable />
      <BatticketEventPanel />
    </div>
  );
}

"use client";

import { AuditTable } from "@/src/features/audit/ui/audit-table";
import { AuditDetailDialog } from "@/src/features/audit/ui/audit-detail-dialog";
import { PageHeader } from "@/src/shared/ui/page-header";

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="감사 로그"
        description="관리자 행위 이력을 조회합니다"
      />
      <AuditTable />
      <AuditDetailDialog />
    </div>
  );
}

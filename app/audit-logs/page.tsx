import { PageHeader } from "@/src/shared/ui/page-header";
import { AuditLogsClient } from "@/src/features/audit-logs/ui/audit-logs-client";

export default function AuditLogsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="감사 로그"
        description="관리자 액션 이력 (영구 보관, SUPER_ADMIN 전용)"
      />
      <AuditLogsClient />
    </div>
  );
}

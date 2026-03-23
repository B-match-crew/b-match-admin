"use client";

import { useAuditStore } from "../model/audit-store";
import { ACTION_LABELS, TARGET_TYPE_LABELS } from "../api/audit-api";
import type { AuditAction, AuditTargetType } from "@/src/entities/audit/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDateTime } from "@/src/shared/lib/format-date";

export function AuditDetailDialog() {
  const { selectedLog, setSelectedLog } = useAuditStore();

  return (
    <Dialog
      open={!!selectedLog}
      onOpenChange={(open) => {
        if (!open) setSelectedLog(null);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>감사 로그 상세</DialogTitle>
          <DialogDescription>
            관리자 행위의 상세 정보와 스냅샷을 확인합니다
          </DialogDescription>
        </DialogHeader>

        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">일시</p>
                <p className="font-medium">
                  {formatDateTime(selectedLog.created_at)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">관리자</p>
                <p className="font-medium">
                  {selectedLog.admin?.email ??
                    selectedLog.admin_id.slice(0, 8)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">행위</p>
                <Badge variant="outline">
                  {ACTION_LABELS[selectedLog.action_type as AuditAction] ??
                    selectedLog.action_type}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">대상</p>
                <p className="font-medium">
                  {TARGET_TYPE_LABELS[selectedLog.target_type as AuditTargetType] ??
                    selectedLog.target_type}{" "}
                  #{selectedLog.target_id}
                </p>
              </div>
            </div>

            <Separator />

            <div className="text-sm">
              <p className="text-muted-foreground">사유</p>
              <p className="mt-1 whitespace-pre-wrap rounded-lg bg-muted p-3">
                {selectedLog.reason}
              </p>
            </div>

            {selectedLog.snapshot && (
              <>
                <Separator />
                <div className="text-sm">
                  <p className="text-muted-foreground">스냅샷</p>
                  <pre className="mt-1 max-h-60 overflow-auto rounded-lg bg-muted p-3 text-xs">
                    {JSON.stringify(selectedLog.snapshot, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

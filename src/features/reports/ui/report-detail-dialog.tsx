"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/src/shared/ui/kit/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/src/shared/ui/kit/dialog";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { InfoField } from "@/src/shared/ui/info-field";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { useAuth } from "@/src/app/providers/auth-provider";
import type { ActionResult } from "@/src/shared/lib/action-result";
import { setReportStatusAction, dismissAllForMatchAction } from "../api/actions";
import type { ReportListItem } from "../model/actions";
import { ActionDialog } from "./dialogs/action-dialog";
import { ActionMode } from "./dialogs/schemas";

export function ReportDetailDialog({
  report,
  onClose,
  onChanged,
}: {
  report: ReportListItem | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { role } = useAuth();
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<ActionMode>(null);

  const open = report !== null;
  const matchDeleted = !!report?.match?.deleted_at;
  const hostName =
    report?.host?.nickname ?? report?.host?.name ?? `#${report?.host_id}`;

  const run = async (
    fn: () => Promise<ActionResult<void>>,
    msg: string
  ) => {
    setBusy(true);
    try {
      const r = await fn();
      if (!r.ok) {
        toast.error(r.error.message);
        return;
      }
      toast.success(msg);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              신고 #{report?.id}
              {report && <StatusBadge status={report.status} />}
            </DialogTitle>
            <DialogDescription>
              접수 {report && formatDateTime(report.created_at)}
            </DialogDescription>
          </DialogHeader>

          {report && (
            <div className="space-y-4 text-sm">
              {/* 신고 내용 */}
              <div className="rounded-lg border border-bds-status-warning/30 bg-bds-status-warning-subtle p-3 space-y-2">
                <h4 className="text-bds-heading3 text-bds-status-warning-text">신고 내용</h4>
                <div className="grid grid-cols-2 gap-3">
                  <InfoField label="사유">{report.reason}</InfoField>
                  <InfoField label="신고자">
                    {report.reporter?.nickname ??
                      report.reporter?.name ??
                      `#${report.reporter_id}`}
                  </InfoField>
                  {report.matchReportCount > 1 && (
                    <InfoField label="이 글 누적 신고">
                      <span className="font-semibold text-bds-status-warning-text">
                        {report.matchReportCount}건
                      </span>
                    </InfoField>
                  )}
                </div>
                {report.detail && (
                  <div>
                    <span className="text-xs text-muted-foreground">상세</span>
                    <p className="mt-0.5 whitespace-pre-wrap">
                      {report.detail}
                    </p>
                  </div>
                )}
              </div>

              {/* 매칭글 내용 */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">매칭글 #{report.match_id}</h4>
                  {matchDeleted ? (
                    <StatusBadge status="DELETED" />
                  ) : (
                    report.match && <StatusBadge status={report.match.status} />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <InfoField label="제목">{report.match?.title ?? "-"}</InfoField>
                  <InfoField label="장소">{report.match?.location_name ?? "-"}</InfoField>
                  <InfoField
                    label={
                      report.match?.contact_type === "URL" ? "연락처 URL" : "연락처"
                    }
                  >
                    {report.match?.contact_value ?? "-"}
                  </InfoField>
                </div>
                {report.match?.description && (
                  <div>
                    <span className="text-xs text-muted-foreground">설명</span>
                    <p className="mt-0.5 whitespace-pre-wrap text-muted-foreground">
                      {report.match.description}
                    </p>
                  </div>
                )}
              </div>

              {/* 호스트 */}
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <InfoField label="호스트">{hostName}</InfoField>
                  <StatusBadge status={report.host?.user_status ?? "ACTIVE"} />
                </div>
              </div>

              {/* 처리 액션 */}
              <div className="space-y-2 rounded-lg border border-dashed p-3">
                <h4 className="font-medium">처리</h4>
                <div className="flex flex-wrap gap-2">
                  {report.status === "PENDING" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        run(
                          () =>
                            setReportStatusAction({
                              reportId: report.id,
                              status: "REVIEWED",
                            }),
                          "검토중으로 표시했습니다"
                        )
                      }
                    >
                      검토중 표시
                    </Button>
                  )}

                  {report.status !== "DISMISSED" &&
                    report.status !== "ACTIONED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          run(
                            () =>
                              setReportStatusAction({
                                reportId: report.id,
                                status: "DISMISSED",
                              }),
                            "신고를 반려했습니다"
                          )
                        }
                      >
                        반려
                      </Button>
                    )}

                  {report.matchReportCount > 1 &&
                    report.status !== "ACTIONED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          run(
                            () =>
                              dismissAllForMatchAction({
                                matchId: report.match_id,
                              }),
                            "이 글의 모든 신고를 반려했습니다"
                          )
                        }
                      >
                        이 글 신고 전체 반려
                      </Button>
                    )}

                  {role === "SUPER_ADMIN" && !matchDeleted && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => setAction({ kind: "delete" })}
                    >
                      매칭글 삭제 + 조치완료
                    </Button>
                  )}

                  {report.host?.user_status === "ACTIVE" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => setAction({ kind: "suspend" })}
                    >
                      호스트 정지
                    </Button>
                  )}

                  {role === "SUPER_ADMIN" &&
                    report.host?.user_status !== "BANNED" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy}
                        onClick={() => setAction({ kind: "ban" })}
                      >
                        호스트 영구차단
                      </Button>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">
                  매칭글 삭제 시 호스트에게 ADMIN_NOTICE 알림이 발송되고 이 글의
                  모든 신고가 조치완료로 변경됩니다.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {report && (
        <ActionDialog
          report={report}
          action={action}
          onClose={() => setAction(null)}
          onDone={() => {
            setAction(null);
            onChanged();
          }}
        />
      )}
    </>
  );
}

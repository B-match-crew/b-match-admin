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
import { ChatTranscript } from "./chat-transcript";
import { setChatReportStatusAction } from "../api/actions";
import type { ChatReportListItem } from "../model/actions";
import { ActionDialog } from "./dialogs/action-dialog";
import { ActionMode } from "./dialogs/schemas";

export function ChatReportDetailDialog({
  report,
  onClose,
  onChanged,
}: {
  report: ChatReportListItem | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { role } = useAuth();
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<ActionMode>(null);

  const open = report !== null;
  const targetName =
    report?.target?.nickname ?? report?.target?.name ?? `#${report?.target_id}`;

  const run = async (fn: () => Promise<ActionResult<void>>, msg: string) => {
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
              채팅 신고 #{report?.id}
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
                <h4 className="text-bds-heading3 text-bds-status-warning-text">
                  신고 내용
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <InfoField label="사유">{report.reason}</InfoField>
                  <InfoField label="신고자">
                    {report.reporter?.nickname ??
                      report.reporter?.name ??
                      `#${report.reporter_id}`}
                  </InfoField>
                  <InfoField label="피신고자">{targetName}</InfoField>
                  {report.targetReportCount > 1 && (
                    <InfoField label="이 유저 누적 신고">
                      <span className="font-semibold text-bds-status-warning-text">
                        {report.targetReportCount}건
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

              {/* 대화 증적 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">
                    보존된 대화 ({report.snapshot.length}건)
                  </h4>
                  {report.room_id === null && (
                    <span className="text-xs text-muted-foreground">
                      원본 대화방은 이미 파기됨
                    </span>
                  )}
                </div>
                <ChatTranscript
                  messages={report.snapshot}
                  targetId={report.target_id}
                  reporterId={report.reporter_id}
                />
                <p className="text-xs text-muted-foreground">
                  신고 시점에 복사해 둔 사본입니다. 원본 대화는 30일 후 파기되며,
                  이 사본은 그와 무관하게 남습니다.
                </p>
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
                            setChatReportStatusAction({
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
                              setChatReportStatusAction({
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

                  {/* 방이 남아 있을 때만. room_id 는 방이 파기되면 SET NULL 이라
                      신고 이력은 있는데 닫을 대상이 없는 상태가 정상적으로 생긴다. */}
                  {report.room_id !== null && report.status !== "ACTIONED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => setAction({ kind: "closeRoom" })}
                    >
                      대화 종료 + 조치완료
                    </Button>
                  )}

                  {report.target?.user_status === "ACTIVE" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => setAction({ kind: "suspend" })}
                    >
                      유저 정지 + 조치완료
                    </Button>
                  )}

                  {role === "SUPER_ADMIN" &&
                    report.target?.user_status !== "BANNED" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy}
                        onClick={() => setAction({ kind: "ban" })}
                      >
                        유저 영구차단 + 조치완료
                      </Button>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">
                  채팅 신고에는 &quot;글 삭제&quot; 같은 대상 제재가 없습니다 —
                  지울 대상이 대화뿐이고, 대화를 지우면 증적이 사라집니다.
                  조치는 <b>대화</b> 또는 <b>사람</b>에게 합니다. 대화 종료는
                  차단이 아니어서, 상대가 다시 문의하면 새 대화가 열립니다.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {report && action && (
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

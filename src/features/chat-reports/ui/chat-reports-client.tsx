"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/shared/ui/kit/table";
import { Button } from "@/src/shared/ui/kit/button";
import { Badge } from "@/src/shared/ui/kit/badge";
import { Input } from "@/src/shared/ui/kit/input";
import { Label } from "@/src/shared/ui/kit/label";
import { Textarea } from "@/src/shared/ui/kit/textarea";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/shared/ui/kit/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/shared/ui/kit/dialog";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { WarningBox } from "@/src/shared/ui/warning-box";
import { InfoField } from "@/src/shared/ui/info-field";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { useAuth } from "@/src/app/providers/auth-provider";
import { REASON_MIN_LENGTH } from "@/src/shared/config/constants";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import type { ActionResult } from "@/src/shared/lib/action-result";
import type { ReportStatus } from "@/src/shared/types/db";
import { ChatTranscript } from "@/src/features/chat-reports/ui/chat-transcript";
import {
  fetchChatReports,
  setChatReportStatusAction,
  suspendChatUserAction,
  banChatUserAction,
  closeChatRoomAction,
  type ChatReportListItem,
} from "@/src/features/chat-reports/actions";

export function ChatReportsClient() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ReportStatus | "ALL">("PENDING");
  const [detail, setDetail] = useState<ChatReportListItem | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["chat-reports", status],
    queryFn: () => unwrap(fetchChatReports({ status, limit: 100 })),
  });

  const refetch = () =>
    queryClient.invalidateQueries({ queryKey: ["chat-reports"] });

  // 상세 모달이 열린 상태에서 목록이 갱신되면 최신 행으로 동기화
  const liveDetail = useMemo(() => {
    if (!detail) return null;
    return data?.find((r) => r.id === detail.id) ?? detail;
  }, [detail, data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as ReportStatus | "ALL")}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">미처리</SelectItem>
            <SelectItem value="REVIEWED">검토중</SelectItem>
            <SelectItem value="ACTIONED">조치완료</SelectItem>
            <SelectItem value="DISMISSED">반려</SelectItem>
            <SelectItem value="ALL">전체</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={refetch}>
          새로고침
        </Button>
      </div>

      {isError && (
        <QueryError section="채팅 신고 목록" error={error} onRetry={refetch} />
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[70px]">ID</TableHead>
              <TableHead>피신고자</TableHead>
              <TableHead>신고 사유</TableHead>
              <TableHead>신고자</TableHead>
              <TableHead>보존 대화</TableHead>
              <TableHead>접수일</TableHead>
              <TableHead>처리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState message="해당 상태의 채팅 신고가 없습니다." />
                </TableCell>
              </TableRow>
            )}
            {data?.map((r) => (
              <TableRow
                key={r.id}
                className="cursor-pointer"
                onClick={() => setDetail(r)}
              >
                <TableCell className="font-mono text-xs">#{r.id}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {r.target?.nickname ?? r.target?.name ?? `#${r.target_id}`}
                    </span>
                    {r.target && r.target.user_status !== "ACTIVE" && (
                      <StatusBadge status={r.target.user_status} />
                    )}
                    {r.targetReportCount > 1 && (
                      <Badge
                        variant="outline"
                        className="border-bds-status-warning/40 bg-bds-status-warning-subtle text-bds-status-warning-text"
                      >
                        신고 {r.targetReportCount}건
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="max-w-[180px]">
                  <span className="text-sm">{r.reason}</span>
                  {r.detail && (
                    <p className="truncate text-xs text-muted-foreground">
                      {r.detail}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {r.reporter?.nickname ??
                    r.reporter?.name ??
                    `#${r.reporter_id}`}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.snapshot.length}건
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(r.created_at)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ChatReportDetailDialog
        report={liveDetail}
        onClose={() => setDetail(null)}
        onChanged={refetch}
      />
    </div>
  );
}

// ─── 상세 + 액션 ───

type ActionMode =
  | { kind: "suspend" }
  | { kind: "ban" }
  | { kind: "closeRoom" }
  | null;

function ChatReportDetailDialog({
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

// ─── 사유 입력 액션 다이얼로그 (정지 / 차단) ───

const reasonField = z
  .string()
  .trim()
  .min(REASON_MIN_LENGTH, `사유는 ${REASON_MIN_LENGTH}자 이상 입력해야 합니다`)
  .max(500);

const banSchema = z.object({ reason: reasonField });
const suspendSchema = z.object({
  until: z.string().min(1, "정지 종료일을 선택하세요"),
  reason: reasonField,
});

function ActionDialog({
  report,
  action,
  onClose,
  onDone,
}: {
  report: ChatReportListItem;
  action: NonNullable<ActionMode>;
  onClose: () => void;
  onDone: () => void;
}) {
  if (action.kind === "suspend") {
    return <SuspendDialog report={report} onClose={onClose} onDone={onDone} />;
  }
  if (action.kind === "closeRoom") {
    return <CloseRoomDialog report={report} onClose={onClose} onDone={onDone} />;
  }
  return <BanDialog report={report} onClose={onClose} onDone={onDone} />;
}

function targetLabel(report: ChatReportListItem) {
  return report.target?.nickname ?? report.target?.name ?? `#${report.target_id}`;
}

function CloseRoomDialog({
  report,
  onClose,
  onDone,
}: {
  report: ChatReportListItem;
  onClose: () => void;
  onDone: () => void;
}) {
  const form = useForm<{ reason: string }>({
    resolver: zodResolver(banSchema),
    defaultValues: { reason: "" },
  });

  const submit = async (v: { reason: string }) => {
    if (report.room_id === null) {
      toast.error("원본 대화방이 이미 파기되어 종료할 수 없습니다");
      return;
    }
    const r = await closeChatRoomAction({
      reportId: report.id,
      roomId: report.room_id,
      reason: v.reason,
    });
    if (!r.ok) {
      toast.error(r.error.message);
      return;
    }
    toast.success("대화를 종료하고 조치완료 처리했습니다");
    onDone();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>대화 종료</DialogTitle>
          <DialogDescription>
            {targetLabel(report)} 님과의 신고된 대화 #{report.room_id}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-3">
          <WarningBox tone="caution">
            입력이 잠기고 양쪽에 &quot;운영자가 이 대화를 종료했습니다&quot;
            안내가 남습니다. <b>차단이 아닙니다</b> — 상대가 다시 문의하면 새
            대화가 열립니다. 반복되면 사람 단위 조치(정지·차단)로 올라가세요.
          </WarningBox>
          <div className="space-y-1.5">
            <Label htmlFor="cr-close-reason">사유 (10자 이상)</Label>
            <Textarea
              id="cr-close-reason"
              rows={3}
              {...form.register("reason")}
            />
            {form.formState.errors.reason && (
              <p className="text-xs text-destructive">
                {form.formState.errors.reason.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              대화 종료
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BanDialog({
  report,
  onClose,
  onDone,
}: {
  report: ChatReportListItem;
  onClose: () => void;
  onDone: () => void;
}) {
  const form = useForm<{ reason: string }>({
    resolver: zodResolver(banSchema),
    defaultValues: { reason: "" },
  });

  const submit = async (v: { reason: string }) => {
    const r = await banChatUserAction({
      reportId: report.id,
      userId: report.target_id,
      reason: v.reason,
    });
    if (!r.ok) {
      toast.error(r.error.message);
      return;
    }
    toast.success("유저를 영구차단하고 조치완료 처리했습니다");
    onDone();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>유저 영구차단</DialogTitle>
          <DialogDescription>{targetLabel(report)}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-3">
          <WarningBox>
            ⚠ 영구차단은 되돌릴 수 없습니다. CI 해시가 블랙리스트에 등록되고 이
            유저의 모든 모임이 강제 삭제됩니다.
          </WarningBox>
          <div className="space-y-1.5">
            <Label htmlFor="cr-ban-reason">사유 (10자 이상)</Label>
            <Textarea id="cr-ban-reason" rows={3} {...form.register("reason")} />
            {form.formState.errors.reason && (
              <p className="text-xs text-destructive">
                {form.formState.errors.reason.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={form.formState.isSubmitting}
            >
              영구차단
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SuspendDialog({
  report,
  onClose,
  onDone,
}: {
  report: ChatReportListItem;
  onClose: () => void;
  onDone: () => void;
}) {
  const form = useForm<{ until: string; reason: string }>({
    resolver: zodResolver(suspendSchema),
    defaultValues: { until: defaultSuspendUntil(), reason: "" },
  });

  const submit = async (v: { until: string; reason: string }) => {
    const r = await suspendChatUserAction({
      reportId: report.id,
      userId: report.target_id,
      until: new Date(v.until).toISOString(),
      reason: v.reason,
    });
    if (!r.ok) {
      toast.error(r.error.message);
      return;
    }
    toast.success("유저를 정지하고 조치완료 처리했습니다");
    onDone();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>유저 정지</DialogTitle>
          <DialogDescription>{targetLabel(report)}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cr-until">정지 종료일</Label>
            <Input
              id="cr-until"
              type="datetime-local"
              {...form.register("until")}
            />
            {form.formState.errors.until && (
              <p className="text-xs text-destructive">
                {form.formState.errors.until.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cr-s-reason">정지 사유 (10자 이상)</Label>
            <Textarea id="cr-s-reason" rows={3} {...form.register("reason")} />
            {form.formState.errors.reason && (
              <p className="text-xs text-destructive">
                {form.formState.errors.reason.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              정지 처리
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function defaultSuspendUntil(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  // datetime-local 포맷 (yyyy-MM-ddTHH:mm)
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

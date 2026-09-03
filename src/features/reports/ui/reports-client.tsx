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
import {
  fetchReports,
  setReportStatusAction,
  dismissAllForMatchAction,
  resolveMatchAction,
  suspendHostAction,
  banHostAction,
  type ReportListItem,
} from "@/src/features/reports/actions";

export function ReportsClient() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ReportStatus | "ALL">("PENDING");
  const [detail, setDetail] = useState<ReportListItem | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["reports", status],
    queryFn: () => unwrap(fetchReports({ status, limit: 100 })),
  });

  const refetch = () =>
    queryClient.invalidateQueries({ queryKey: ["reports"] });

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
        <QueryError section="신고 목록" error={error} onRetry={refetch} />
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[70px]">ID</TableHead>
              <TableHead>매칭글</TableHead>
              <TableHead>신고 사유</TableHead>
              <TableHead>신고자</TableHead>
              <TableHead>호스트</TableHead>
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
                  <EmptyState message="해당 상태의 신고가 없습니다." />
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
                      {r.match?.title ?? `#${r.match_id}`}
                    </span>
                    {r.match?.deleted_at && <StatusBadge status="DELETED" />}
                    {r.matchReportCount > 1 && (
                      <Badge
                        variant="outline"
                        className="border-bds-status-warning/40 bg-bds-status-warning-subtle text-bds-status-warning-text"
                      >
                        신고 {r.matchReportCount}건
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.match?.location_name}
                  </p>
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
                  {r.reporter?.nickname ?? r.reporter?.name ?? `#${r.reporter_id}`}
                </TableCell>
                <TableCell className="text-sm">
                  <div className="flex items-center gap-1.5">
                    {r.host?.nickname ?? r.host?.name ?? `#${r.host_id}`}
                    {r.host && r.host.user_status !== "ACTIVE" && (
                      <StatusBadge status={r.host.user_status} />
                    )}
                  </div>
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

      <ReportDetailDialog
        report={liveDetail}
        onClose={() => setDetail(null)}
        onChanged={refetch}
      />
    </div>
  );
}

// ─── 신고 상세 + 액션 ───

type ActionMode =
  | { kind: "delete" }
  | { kind: "suspend" }
  | { kind: "ban" }
  | null;

function ReportDetailDialog({
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


// ─── 사유 입력 액션 다이얼로그 (삭제 / 정지 / 차단) ───

const reasonField = z
  .string()
  .trim()
  .min(REASON_MIN_LENGTH, `사유는 ${REASON_MIN_LENGTH}자 이상 입력해야 합니다`)
  .max(500);

const deleteSchema = z.object({ reason: reasonField });
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
  report: ReportListItem;
  action: ActionMode;
  onClose: () => void;
  onDone: () => void;
}) {
  if (!action) return null;
  if (action.kind === "suspend") {
    return (
      <SuspendDialog report={report} onClose={onClose} onDone={onDone} />
    );
  }
  return <ReasonDialog kind={action.kind} report={report} onClose={onClose} onDone={onDone} />;
}

function ReasonDialog({
  kind,
  report,
  onClose,
  onDone,
}: {
  kind: "delete" | "ban";
  report: ReportListItem;
  onClose: () => void;
  onDone: () => void;
}) {
  const form = useForm<{ reason: string }>({
    resolver: zodResolver(kind === "delete" ? deleteSchema : banSchema),
    defaultValues: { reason: "" },
  });

  const submit = async (v: { reason: string }) => {
    if (kind === "delete") {
      const r = await resolveMatchAction({
        matchId: report.match_id,
        reason: v.reason,
      });
      if (!r.ok) {
        toast.error(r.error.message);
        return;
      }
      toast.success("매칭글을 삭제하고 조치완료 처리했습니다");
    } else {
      const r = await banHostAction({
        userId: report.host_id,
        reason: v.reason,
      });
      if (!r.ok) {
        toast.error(r.error.message);
        return;
      }
      toast.success("호스트를 영구차단했습니다");
    }
    onDone();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {kind === "delete" ? "매칭글 직권 삭제" : "호스트 영구차단"}
          </DialogTitle>
          <DialogDescription>
            {kind === "delete"
              ? `#${report.match_id} ${report.match?.title ?? ""}`
              : report.host?.nickname ?? report.host?.name ?? `#${report.host_id}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-3">
          <WarningBox>
            {kind === "delete"
              ? "⚠ 매칭글이 삭제되고 호스트에게 ADMIN_NOTICE 알림이 발송됩니다. 이 글의 모든 신고가 조치완료로 바뀝니다."
              : "⚠ 영구차단은 되돌릴 수 없습니다. CI 해시가 블랙리스트에 등록되고 이 호스트의 모든 모임이 강제 삭제됩니다."}
          </WarningBox>
          <div className="space-y-1.5">
            <Label htmlFor="reason">사유 (10자 이상)</Label>
            <Textarea id="reason" rows={3} {...form.register("reason")} />
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
              {kind === "delete" ? "삭제" : "영구차단"}
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
  report: ReportListItem;
  onClose: () => void;
  onDone: () => void;
}) {
  const form = useForm<{ until: string; reason: string }>({
    resolver: zodResolver(suspendSchema),
    defaultValues: {
      until: defaultSuspendUntil(),
      reason: "",
    },
  });

  const submit = async (v: { until: string; reason: string }) => {
    const r = await suspendHostAction({
      userId: report.host_id,
      until: new Date(v.until).toISOString(),
      reason: v.reason,
    });
    if (!r.ok) {
      toast.error(r.error.message);
      return;
    }
    toast.success("호스트를 정지했습니다");
    onDone();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>호스트 정지</DialogTitle>
          <DialogDescription>
            {report.host?.nickname ?? report.host?.name ?? `#${report.host_id}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="until">정지 종료일</Label>
            <Input id="until" type="datetime-local" {...form.register("until")} />
            {form.formState.errors.until && (
              <p className="text-xs text-destructive">
                {form.formState.errors.until.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-reason">정지 사유 (10자 이상)</Label>
            <Textarea id="s-reason" rows={3} {...form.register("reason")} />
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

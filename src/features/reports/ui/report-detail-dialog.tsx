"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { useAuth } from "@/src/app/providers/auth-provider";
import { REASON_MIN_LENGTH } from "@/src/shared/config/constants";
import { toUserMessage } from "@/src/shared/lib/error-codes";
import {
  fetchReportTarget,
  rejectReport,
  suspendReportedUser,
  banReportedUser,
  unblindReportedPost,
  unblindReportedComment,
  type ReportRow,
  type ReportTargetContent,
} from "@/src/features/reports/actions";

interface Props {
  report: ReportRow | null;
  onClose: () => void;
  onResolved: () => void;
}

const reasonSchema = z
  .string()
  .trim()
  .min(REASON_MIN_LENGTH, `사유는 ${REASON_MIN_LENGTH}자 이상 입력해야 합니다`)
  .max(500);

const suspendSchema = z.object({
  until: z.string().min(1, "정지 종료일을 선택하세요"),
  reason: reasonSchema,
});
type SuspendForm = z.infer<typeof suspendSchema>;

const reasonOnlySchema = z.object({ reason: reasonSchema });
type ReasonOnlyForm = z.infer<typeof reasonOnlySchema>;

export function ReportDetailDialog({ report, onClose, onResolved }: Props) {
  const { role } = useAuth();
  const open = !!report;

  const { data: target, isLoading: targetLoading } = useQuery({
    queryKey: ["report-target", report?.target_type, report?.target_id],
    queryFn: () => fetchReportTarget(report!.target_type, report!.target_id),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>신고 #{report?.id} 검토</DialogTitle>
          <DialogDescription>
            대상 콘텐츠를 확인하고 처리 방법을 선택하세요.
          </DialogDescription>
        </DialogHeader>

        {report && (
          <div className="space-y-4">
            {/* 메타 정보 */}
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
              <Meta label="대상">
                <StatusBadge status={report.target_type} />{" "}
                <span className="font-mono text-xs">#{report.target_id}</span>
              </Meta>
              <Meta label="누적 신고">{report.cumulative_count}건</Meta>
              <Meta label="신고자">
                {report.reporter?.nickname ?? report.reporter?.name ?? "-"}
              </Meta>
              <Meta label="접수 시각">{formatDateTime(report.created_at)}</Meta>
            </div>

            {/* 대상 콘텐츠 */}
            <div className="rounded-lg border p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                대상 콘텐츠
              </p>
              {targetLoading ? (
                <p className="text-sm text-muted-foreground">불러오는 중...</p>
              ) : (
                <TargetContentView target={target} />
              )}
            </div>

            {/* 액션 탭 */}
            <Tabs defaultValue="reject">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="reject">반려</TabsTrigger>
                <TabsTrigger value="unblind">블라인드 해제</TabsTrigger>
                <TabsTrigger value="suspend">정지</TabsTrigger>
                <TabsTrigger value="ban" disabled={role !== "SUPER_ADMIN"}>
                  영구차단
                </TabsTrigger>
              </TabsList>

              <TabsContent value="reject">
                <RejectPanel reportId={report.id} onDone={onResolved} />
              </TabsContent>
              <TabsContent value="unblind">
                {report.target_type === "POST" ? (
                  <UnblindPanel
                    postId={report.target_id}
                    onDone={onResolved}
                  />
                ) : (
                  <UnblindCommentPanel
                    commentId={report.target_id}
                    onDone={onResolved}
                  />
                )}
              </TabsContent>
              <TabsContent value="suspend">
                <SuspendPanel
                  authorId={
                    target?.post?.author?.id ?? target?.comment?.author?.id ?? ""
                  }
                  reportId={report.id}
                  disabled={!target}
                  onDone={onResolved}
                />
              </TabsContent>
              <TabsContent value="ban">
                <BanPanel
                  authorId={
                    target?.post?.author?.id ?? target?.comment?.author?.id ?? ""
                  }
                  reportId={report.id}
                  disabled={!target}
                  onDone={onResolved}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function TargetContentView({ target }: { target?: ReportTargetContent }) {
  if (!target) return <p className="text-sm text-muted-foreground">대상 정보 없음</p>;

  if (target.type === "POST" && target.post) {
    const p = target.post;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{p.title}</span>
          {p.is_blind && <StatusBadge status="BLINDED" />}
        </div>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {p.content}
        </p>
        <p className="text-xs text-muted-foreground">
          작성자: {p.author?.nickname ?? p.author?.name ?? "-"} ·{" "}
          {formatDateTime(p.created_at)}
        </p>
      </div>
    );
  }

  if (target.type === "COMMENT" && target.comment) {
    const c = target.comment;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">댓글 #{c.id}</span>
          {c.is_blind && <StatusBadge status="BLINDED" />}
        </div>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {c.content}
        </p>
        <p className="text-xs text-muted-foreground">
          작성자: {c.author?.nickname ?? c.author?.name ?? "-"} ·{" "}
          {formatDateTime(c.created_at)}
        </p>
      </div>
    );
  }

  return <p className="text-sm text-muted-foreground">대상 정보 없음</p>;
}

// ─── 액션 패널들 ───

function RejectPanel({ reportId, onDone }: { reportId: number; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  return (
    <div className="space-y-3 p-3">
      <p className="text-sm text-muted-foreground">
        신고를 반려 처리합니다. 사유 기록 없이 즉시 RESOLVED로 전환됩니다.
      </p>
      <Button
        variant="outline"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          try {
            await rejectReport(reportId);
            onDone();
          } catch (e) {
            toast.error(toUserMessage(e));
          } finally {
            setPending(false);
          }
        }}
      >
        반려 처리
      </Button>
    </div>
  );
}

function UnblindCommentPanel({ commentId, onDone }: { commentId: number; onDone: () => void }) {
  const form = useForm<ReasonOnlyForm>({
    resolver: zodResolver(reasonOnlySchema),
    defaultValues: { reason: "" },
  });

  const onSubmit = async (v: ReasonOnlyForm) => {
    try {
      await unblindReportedComment({ commentId, reason: v.reason });
      onDone();
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 p-3">
      <div className="space-y-1.5">
        <Label htmlFor="unblind-comment-reason">해제 사유 (10자 이상)</Label>
        <Textarea
          id="unblind-comment-reason"
          rows={3}
          placeholder="예: 오인 신고 판명, 정상 댓글 확인 완료"
          {...form.register("reason")}
        />
        {form.formState.errors.reason && (
          <p className="text-xs text-destructive">
            {form.formState.errors.reason.message}
          </p>
        )}
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        댓글 블라인드 해제
      </Button>
    </form>
  );
}

function UnblindPanel({ postId, onDone }: { postId: number; onDone: () => void }) {
  const form = useForm<ReasonOnlyForm>({
    resolver: zodResolver(reasonOnlySchema),
    defaultValues: { reason: "" },
  });

  const onSubmit = async (v: ReasonOnlyForm) => {
    try {
      await unblindReportedPost({ postId, reason: v.reason });
      onDone();
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 p-3">
      <div className="space-y-1.5">
        <Label htmlFor="unblind-reason">해제 사유 (10자 이상)</Label>
        <Textarea
          id="unblind-reason"
          rows={3}
          placeholder="예: 오인 신고 판명, 정상 게시글 확인 완료"
          {...form.register("reason")}
        />
        {form.formState.errors.reason && (
          <p className="text-xs text-destructive">
            {form.formState.errors.reason.message}
          </p>
        )}
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        블라인드 해제
      </Button>
    </form>
  );
}

function SuspendPanel({
  authorId,
  reportId,
  disabled,
  onDone,
}: {
  authorId: string;
  reportId: number;
  disabled?: boolean;
  onDone: () => void;
}) {
  const form = useForm<SuspendForm>({
    resolver: zodResolver(suspendSchema),
    defaultValues: { until: "", reason: "" },
  });

  // 기본값: 7일 후
  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    form.setValue("until", d.toISOString().slice(0, 16));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (v: SuspendForm) => {
    if (!authorId) {
      toast.error("작성자 정보를 찾을 수 없습니다");
      return;
    }
    try {
      await suspendReportedUser({
        userId: authorId,
        until: new Date(v.until).toISOString(),
        reason: v.reason,
        reportId,
      });
      onDone();
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 p-3">
      <div className="space-y-1.5">
        <Label htmlFor="suspend-until">정지 종료일</Label>
        <Input
          id="suspend-until"
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
        <Label htmlFor="suspend-reason">정지 사유 (10자 이상)</Label>
        <Textarea
          id="suspend-reason"
          rows={3}
          placeholder="예: 욕설 신고 누적 (3건 검증 완료)"
          {...form.register("reason")}
        />
        {form.formState.errors.reason && (
          <p className="text-xs text-destructive">
            {form.formState.errors.reason.message}
          </p>
        )}
      </div>
      <Button type="submit" disabled={disabled || form.formState.isSubmitting}>
        정지 처리
      </Button>
    </form>
  );
}

function BanPanel({
  authorId,
  reportId,
  disabled,
  onDone,
}: {
  authorId: string;
  reportId: number;
  disabled?: boolean;
  onDone: () => void;
}) {
  const form = useForm<ReasonOnlyForm>({
    resolver: zodResolver(reasonOnlySchema),
    defaultValues: { reason: "" },
  });

  const onSubmit = async (v: ReasonOnlyForm) => {
    if (!authorId) {
      toast.error("작성자 정보를 찾을 수 없습니다");
      return;
    }
    try {
      await banReportedUser({
        userId: authorId,
        reason: v.reason,
        reportId,
      });
      onDone();
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 p-3">
      <div className="rounded-md border border-destructive/50 bg-destructive/5 p-2 text-xs text-destructive">
        ⚠ 영구차단은 되돌릴 수 없습니다. CI 해시가 블랙리스트에 등록되며,
        해당 호스트의 모든 모임이 강제 삭제됩니다.
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ban-reason">차단 사유 (10자 이상)</Label>
        <Textarea
          id="ban-reason"
          rows={3}
          placeholder="예: 명백한 사기 행위 적발, 민원 다수 누적"
          {...form.register("reason")}
        />
        {form.formState.errors.reason && (
          <p className="text-xs text-destructive">
            {form.formState.errors.reason.message}
          </p>
        )}
      </div>
      <Button
        type="submit"
        variant="destructive"
        disabled={disabled || form.formState.isSubmitting}
      >
        영구차단 처리
      </Button>
    </form>
  );
}

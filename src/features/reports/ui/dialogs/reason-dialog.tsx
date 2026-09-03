"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/src/shared/ui/kit/button";
import { Label } from "@/src/shared/ui/kit/label";
import { Textarea } from "@/src/shared/ui/kit/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/src/shared/ui/kit/dialog";
import { WarningBox } from "@/src/shared/ui/warning-box";
import { resolveMatchAction, banHostAction } from "../../api/actions";
import type { ReportListItem } from "../../model/actions";
import { banSchema, deleteSchema } from "./schemas";

export function ReasonDialog({
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

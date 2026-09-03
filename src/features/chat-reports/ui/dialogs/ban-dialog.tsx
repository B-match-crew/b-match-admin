"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/src/shared/ui/kit/button";
import { Label } from "@/src/shared/ui/kit/label";
import { Textarea } from "@/src/shared/ui/kit/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/src/shared/ui/kit/dialog";
import { WarningBox } from "@/src/shared/ui/warning-box";
import { banChatUserAction } from "../../api/actions";
import type { ChatReportListItem } from "../../model/actions";
import { banSchema, targetLabel } from "./schemas";

export function BanDialog({
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

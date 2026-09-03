"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/src/shared/ui/kit/button";
import { Label } from "@/src/shared/ui/kit/label";
import { Textarea } from "@/src/shared/ui/kit/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/src/shared/ui/kit/dialog";
import { WarningBox } from "@/src/shared/ui/warning-box";
import { closeChatRoomAction } from "../../api/actions";
import type { ChatReportListItem } from "../../model/actions";
import { banSchema, targetLabel } from "./schemas";

export function CloseRoomDialog({
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

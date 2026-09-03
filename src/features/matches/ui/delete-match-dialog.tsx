"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/src/shared/ui/kit/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/src/shared/ui/kit/dialog";
import { Label } from "@/src/shared/ui/kit/label";
import { Textarea } from "@/src/shared/ui/kit/textarea";
import { WarningBox } from "@/src/shared/ui/warning-box";
import { deleteMatchAction } from "../api/actions";
import type { MatchListItem } from "../model/actions";
import { ReasonForm, reasonSchema } from "./schemas";

export function DeleteMatchDialog({
  match,
  onClose,
  onDone,
}: {
  match: MatchListItem | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const form = useForm<ReasonForm>({
    resolver: zodResolver(reasonSchema),
    defaultValues: { reason: "" },
  });

  const onSubmit = async (v: ReasonForm) => {
    if (!match) return;
    const r = await deleteMatchAction({ matchId: match.id, reason: v.reason });
    if (!r.ok) {
      toast.error(r.error.message);
      return;
    }
    onDone();
    form.reset();
  };

  return (
    <Dialog open={!!match} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>매칭 직권 삭제</DialogTitle>
          <DialogDescription>
            #{match?.id} {match?.title}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          {/* 고지 여부는 **모집 상태**로 갈린다(app migration 97). 마감·종료된 글까지
              울리면 고지가 소음이 되고, 소음이 되면 정작 모집중인 글이 내려갔을 때의
              고지도 함께 묻힌다. 운영자가 누르기 전에 어느 쪽인지 알아야 한다. */}
          {match?.status === "RECRUITING" ? (
            <WarningBox>
              ⚠ 모집중인 글이라 호스트에게 <b>푸시 알림이 즉시 발송</b>됩니다.
              아래 <b>삭제 사유가 알림 본문으로 그대로 전달</b>되니 호스트가 읽는
              문장으로 작성하세요.
            </WarningBox>
          ) : (
            <WarningBox tone="caution">
              마감·종료된 글이라 <b>호스트에게 알림이 가지 않습니다.</b> 삭제 사유는
              감사 로그에만 남습니다.
            </WarningBox>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="del-reason">삭제 사유 (10자 이상)</Label>
            <Textarea id="del-reason" rows={3} {...form.register("reason")} />
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
              삭제
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

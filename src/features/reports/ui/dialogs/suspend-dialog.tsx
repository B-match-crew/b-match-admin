"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/src/shared/ui/kit/button";
import { Input } from "@/src/shared/ui/kit/input";
import { Label } from "@/src/shared/ui/kit/label";
import { Textarea } from "@/src/shared/ui/kit/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/src/shared/ui/kit/dialog";
import { suspendHostAction } from "../../api/actions";
import type { ReportListItem } from "../../model/actions";
import { defaultSuspendUntil, suspendSchema } from "./schemas";

export function SuspendDialog({
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

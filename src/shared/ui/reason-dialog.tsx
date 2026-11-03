"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/src/shared/ui/kit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/shared/ui/kit/dialog";
import { Label } from "@/src/shared/ui/kit/label";
import { Textarea } from "@/src/shared/ui/kit/textarea";
import { z } from "zod";
import { REASON_MIN_LENGTH } from "@/src/shared/config/constants";

/** 조치 사유 — 서버(137 · 138 의 payment.require_reason)와 같은 10자 하한. */
const reasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(REASON_MIN_LENGTH, `사유는 ${REASON_MIN_LENGTH}자 이상 입력해야 합니다`)
    .max(500),
});

type ReasonForm = z.infer<typeof reasonSchema>;

/**
 * 사유를 받는 확인 다이얼로그 — 결제(강제 환불 · 환불 재시도 · 설정)와 정산(회차 만들기 · 승인 · 취소 ·
 * 보류 · 해제 · 재시도 · 킬 스위치)이 같이 쓴다. 제출 중에는 버튼을 막는다.
 */
export function ReasonDialog({
  open,
  title,
  description,
  warning,
  confirmLabel,
  destructive,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  warning?: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  onClose: () => void;
  /** true 면 닫는다 */
  onSubmit: (reason: string) => Promise<boolean>;
}) {
  const form = useForm<ReasonForm>({
    resolver: zodResolver(reasonSchema),
    defaultValues: { reason: "" },
  });
  const [busy, setBusy] = useState(false);

  const submit = async (v: ReasonForm) => {
    setBusy(true);
    try {
      if (await onSubmit(v.reason)) {
        form.reset();
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-3">
          {warning}
          <div className="space-y-1.5">
            <Label htmlFor="action-reason">사유 (10자 이상 · 감사 로그에 남습니다)</Label>
            <Textarea id="action-reason" rows={3} {...form.register("reason")} />
            {form.formState.errors.reason && (
              <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              취소
            </Button>
            <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={busy}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

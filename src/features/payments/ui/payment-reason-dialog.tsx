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
import { paymentReasonSchema, type PaymentReasonForm } from "./schemas";

/**
 * 사유를 받는 확인 다이얼로그 — 강제 환불 · 환불 재시도 · 설정 변경이 같이 쓴다.
 * 제출 중에는 버튼을 막는다(같은 요청 키라 연타해도 서버가 하나로 묶지만, 화면도 막는다).
 */
export function PaymentReasonDialog({
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
  const form = useForm<PaymentReasonForm>({
    resolver: zodResolver(paymentReasonSchema),
    defaultValues: { reason: "" },
  });
  const [busy, setBusy] = useState(false);

  const submit = async (v: PaymentReasonForm) => {
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
            <Label htmlFor="payment-reason">사유 (10자 이상 · 감사 로그에 남습니다)</Label>
            <Textarea id="payment-reason" rows={3} {...form.register("reason")} />
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

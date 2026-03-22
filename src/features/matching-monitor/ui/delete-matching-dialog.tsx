"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Match } from "@/src/entities/matching/types";
import { AlertTriangle } from "lucide-react";

interface DeleteMatchingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matching: Match | null;
  onConfirm: (reason: string, notifyHost: boolean) => Promise<void>;
}

export function DeleteMatchingDialog({
  open,
  onOpenChange,
  matching,
  onConfirm,
}: DeleteMatchingDialogProps) {
  const [reason, setReason] = useState("");
  const [notifyHost, setNotifyHost] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!reason.trim() || reason.trim().length < 10) return;

    setIsLoading(true);
    try {
      await onConfirm(reason, notifyHost);
      handleClose();
    } catch (error) {
      console.error("매칭 취소 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setReason("");
    setNotifyHost(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            매칭 강제 취소
          </DialogTitle>
          <DialogDescription>
            <span className="font-semibold">{matching?.title}</span> 매칭을 강제
            취소합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm text-destructive">
              이 작업은 되돌릴 수 없습니다. 매칭이 취소되면 참여 중인 모든
              유저에게 영향을 미칩니다.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              취소 사유 <span className="text-destructive">* (최소 10자)</span>
            </label>
            <Textarea
              placeholder="취소 사유를 입력해 주세요 (최소 10자)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="notify-host"
              checked={notifyHost}
              onChange={(e) => setNotifyHost(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="notify-host" className="text-sm">
              호스트에게 취소 알림 발송
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            닫기
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim() || reason.trim().length < 10 || isLoading}
          >
            {isLoading ? "처리 중..." : "강제 취소"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import type { User } from "@/src/entities/user/types";
import { AlertTriangle } from "lucide-react";

interface SuspensionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onConfirm: (reason: string) => Promise<void>;
}

export function SuspensionDialog({
  open,
  onOpenChange,
  user,
  onConfirm,
}: SuspensionDialogProps) {
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!reason.trim()) return;

    setIsLoading(true);
    try {
      await onConfirm(reason);
      handleClose();
    } catch (error) {
      console.error("유저 정지 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            유저 강제 정지
          </DialogTitle>
          <DialogDescription>
            <span className="font-semibold">{user?.nickname}</span> 님의 계정을
            강제 정지합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm text-destructive">
              이 작업은 해당 유저의 서비스 이용을 즉시 제한합니다. 정지된 유저는
              로그인 및 매칭 참여가 불가능합니다.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              정지 사유 <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="정지 사유를 입력해 주세요"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim() || isLoading}
          >
            {isLoading ? "처리 중..." : "정지"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

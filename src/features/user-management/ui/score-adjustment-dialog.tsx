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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { User } from "@/src/entities/user/types";

interface ScoreAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onConfirm: (scoreChange: number, reason: string) => Promise<void>;
}

export function ScoreAdjustmentDialog({
  open,
  onOpenChange,
  user,
  onConfirm,
}: ScoreAdjustmentDialogProps) {
  const [scoreChange, setScoreChange] = useState<string>("");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    const change = parseInt(scoreChange, 10);
    if (isNaN(change) || change === 0) return;
    if (!reason.trim()) return;

    setIsLoading(true);
    try {
      await onConfirm(change, reason);
      handleClose();
    } catch (error) {
      console.error("점수 조정 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setScoreChange("");
    setReason("");
    onOpenChange(false);
  };

  const parsedChange = parseInt(scoreChange, 10);
  const newScore = user
    ? user.badticket_score + (isNaN(parsedChange) ? 0 : parsedChange)
    : 0;

  const isValid =
    !isNaN(parsedChange) && parsedChange !== 0 && reason.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>배티켓 점수 조정</DialogTitle>
          <DialogDescription>
            {user?.nickname} 님의 배티켓 점수를 조정합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">현재 점수</span>
              <span className="font-semibold text-lg">
                {user?.badticket_score ?? 0}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">점수 변경 (+/-)</label>
            <Input
              type="number"
              placeholder="예: +10 또는 -5"
              value={scoreChange}
              onChange={(e) => setScoreChange(e.target.value)}
            />
            {scoreChange && !isNaN(parsedChange) && (
              <p className="text-sm text-muted-foreground">
                변경 후 점수:{" "}
                <span className="font-semibold">{newScore}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              조정 사유 <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="점수 조정 사유를 입력해 주세요"
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
          <Button onClick={handleConfirm} disabled={!isValid || isLoading}>
            {isLoading ? "처리 중..." : "확인"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

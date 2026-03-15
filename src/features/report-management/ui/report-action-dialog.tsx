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
import type { Report } from "@/src/entities/report/types";
import { cn } from "@/lib/utils";
import { AlertTriangle, Shield, ShieldOff, ShieldCheck } from "lucide-react";

type ActionType = "경고" | "정지" | "무혐의";

interface ReportActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: Report | null;
  onConfirm: (action: ActionType, adminNote: string) => Promise<void>;
}

const actionOptions: {
  value: ActionType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: "경고",
    label: "경고",
    description: "신고 대상에 대해 경고 조치를 합니다",
    icon: <Shield className="h-5 w-5" />,
    color: "border-orange-300 bg-orange-50 text-orange-700",
  },
  {
    value: "정지",
    label: "정지",
    description: "사용자 신고 시 해당 계정을 정지합니다",
    icon: <ShieldOff className="h-5 w-5" />,
    color: "border-red-300 bg-red-50 text-red-700",
  },
  {
    value: "무혐의",
    label: "무혐의",
    description: "신고 내용에 해당 사항이 없습니다",
    icon: <ShieldCheck className="h-5 w-5" />,
    color: "border-blue-300 bg-blue-50 text-blue-700",
  },
];

export function ReportActionDialog({
  open,
  onOpenChange,
  report,
  onConfirm,
}: ReportActionDialogProps) {
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!selectedAction) return;

    setIsLoading(true);
    try {
      await onConfirm(selectedAction, adminNote);
      handleClose();
    } catch (error) {
      console.error("신고 처리 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedAction(null);
    setAdminNote("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>신고 처리</DialogTitle>
          <DialogDescription>
            {report?.target_label ?? "신고 대상"}에 대한 신고를 처리합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 처리 유형 선택 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">처리 결과 선택</label>
            <div className="grid gap-2">
              {actionOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                    selectedAction === option.value
                      ? option.color
                      : "border-border hover:bg-muted"
                  )}
                  onClick={() => setSelectedAction(option.value)}
                >
                  {option.icon}
                  <div>
                    <p className="text-sm font-medium">{option.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 정지 경고 */}
          {selectedAction === "정지" && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive font-medium">
                  주의: 정지 처리 시 해당 유저의 서비스 이용이 즉시 제한됩니다
                </p>
              </div>
            </div>
          )}

          {/* 관리자 메모 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">관리자 메모</label>
            <Textarea
              placeholder="처리에 대한 메모를 입력해 주세요"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            취소
          </Button>
          <Button
            variant={selectedAction === "정지" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={!selectedAction || isLoading}
          >
            {isLoading ? "처리 중..." : "확인"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

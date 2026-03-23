"use client";

import { useState } from "react";
import { useAuth } from "@/src/app/providers/auth-provider";
import { useSettlementStore } from "../model/settlement-store";
import { generateTossBulkTransferText } from "../api/settlement-api";
import { adminUpdateSettlementStatus } from "@/src/app/actions/admin-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Copy, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

interface SettlementActionBarProps {
  onRefresh: () => void;
}

export function SettlementActionBar({ onRefresh }: SettlementActionBarProps) {
  const { user } = useAuth();
  const { settlements, selectedIds, clearSelection } = useSettlementStore();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [checksumInput, setChecksumInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedSettlements = settlements.filter((s) =>
    selectedIds.includes(s.id)
  );

  const hasSelection = selectedIds.length > 0;

  const handleCopyTransferText = async () => {
    if (selectedSettlements.length === 0) return;

    const text = generateTossBulkTransferText(selectedSettlements);
    await navigator.clipboard.writeText(text);
    toast.success(
      `${selectedSettlements.length}건 이체 텍스트가 복사되었습니다`
    );

    if (!user?.id) return;

    // PENDING → EXPORTED 상태 변경
    const pendingIds = selectedSettlements
      .filter((s) => s.status === "PENDING")
      .map((s) => s.id);

    if (pendingIds.length > 0) {
      try {
        await adminUpdateSettlementStatus(
          pendingIds,
          "EXPORTED",
          user.id,
          "Toss 일괄이체 텍스트 복사"
        );
        onRefresh();
      } catch (error) {
        console.error("상태 변경 실패:", error);
      }
    }
  };

  const handleCompleteConfirm = async () => {
    if (!user?.id) return;

    const expectedCount = selectedIds.length;
    const inputCount = parseInt(checksumInput, 10);

    if (inputCount !== expectedCount) {
      toast.error(
        `체크섬 불일치: 선택 ${expectedCount}건, 입력 ${inputCount}건. 다시 확인해주세요.`
      );
      return;
    }

    setIsProcessing(true);
    try {
      await adminUpdateSettlementStatus(
        selectedIds,
        "COMPLETED",
        user.id,
        "송금 완료 처리"
      );
      toast.success(`${expectedCount}건 송금 완료 처리되었습니다`);
      clearSelection();
      setConfirmOpen(false);
      setChecksumInput("");
      onRefresh();
    } catch (error) {
      console.error("송금 완료 처리 실패:", error);
      toast.error("송금 완료 처리에 실패했습니다");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAccountError = async () => {
    if (!user?.id || selectedIds.length === 0) return;

    setIsProcessing(true);
    try {
      await adminUpdateSettlementStatus(
        selectedIds,
        "FAILED",
        user.id,
        "계좌 오류 반려"
      );
      toast.success(`${selectedIds.length}건 계좌 오류 반려 처리되었습니다`);
      clearSelection();
      onRefresh();
    } catch (error) {
      console.error("계좌 오류 반려 실패:", error);
      toast.error("계좌 오류 반려에 실패했습니다");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
        <span className="mr-2 text-sm text-muted-foreground">
          {selectedIds.length}건 선택됨
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyTransferText}
          disabled={!hasSelection}
        >
          <Copy className="mr-1 h-4 w-4" />
          Toss 일괄이체 텍스트 복사
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          disabled={!hasSelection}
        >
          <CheckCircle className="mr-1 h-4 w-4" />
          송금 완료 처리
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleAccountError}
          disabled={!hasSelection || isProcessing}
        >
          <XCircle className="mr-1 h-4 w-4" />
          계좌 오류 반려
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>송금 완료 처리 확인</DialogTitle>
            <DialogDescription>
              이중 송금 방지를 위해 Toss 앱에서 성공한 이체 건수를 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <p className="text-sm text-yellow-700">
                  현재 선택된 항목: <strong>{selectedIds.length}건</strong>.
                  완료 처리 후 되돌릴 수 없습니다.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Toss에서 성공한 이체 건수 입력
              </label>
              <Input
                type="number"
                placeholder="건수를 입력하세요"
                value={checksumInput}
                onChange={(e) => setChecksumInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isProcessing}
            >
              취소
            </Button>
            <Button
              onClick={handleCompleteConfirm}
              disabled={!checksumInput || isProcessing}
            >
              {isProcessing ? "처리 중..." : "확인"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

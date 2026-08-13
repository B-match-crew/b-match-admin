"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Megaphone } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import {
  broadcastNoticeAction,
  fetchBroadcastPreviewCount,
} from "@/src/features/notices/actions";
import {
  NOTICE_BODY_MAX,
  NOTICE_TITLE_MAX,
  type BroadcastTarget,
} from "@/src/features/notices/constants";

/** 2단계 확인에서 입력해야 하는 문구. */
const CONFIRM_WORD = "발송";

const TARGETS: { value: BroadcastTarget; label: string; hint: string }[] = [
  { value: "ALL", label: "전체", hint: "가입을 마친 모든 회원" },
  { value: "HOST", label: "모임장만", hint: "모임을 운영 중인 회원" },
];

export function NoticeBroadcastClient() {
  const [target, setTarget] = useState<BroadcastTarget>("ALL");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [sending, setSending] = useState(false);

  // 대상 수는 발송 함수와 같은 조건을 쓴다 — 이게 없으면 실수로 전체 발송이 나간다.
  const preview = useQuery({
    queryKey: ["broadcast-preview", target],
    queryFn: () => unwrap(fetchBroadcastPreviewCount(target)),
  });

  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  const canSend =
    trimmedTitle.length > 0 &&
    trimmedBody.length > 0 &&
    trimmedTitle.length <= NOTICE_TITLE_MAX &&
    trimmedBody.length <= NOTICE_BODY_MAX;

  const openConfirm = () => {
    setConfirmInput("");
    setConfirmOpen(true);
  };

  const send = async () => {
    setSending(true);
    try {
      const r = await broadcastNoticeAction({
        title: trimmedTitle,
        body: trimmedBody,
        target,
      });
      if (!r.ok) {
        toast.error(r.error.message);
        return;
      }
      toast.success(`${r.data.toLocaleString()}명에게 발송했습니다`);
      setConfirmOpen(false);
      setTitle("");
      setBody("");
      await preview.refetch();
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="size-4" />
          공지 발송
        </CardTitle>
        <CardDescription>
          대상 전원에게 즉시 푸시가 나갑니다. 수신 설정과 무관하게 도달하는
          시스템 알림이므로 꼭 필요한 경우에만 사용하세요.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertDescription>
            문구가 <b>혜택·이벤트 등 유인성 표현</b>을 담으면 광고성 정보로
            재분류되어 <b>(광고) 표기·야간(21~08시) 발송 제한·사전 수신 동의</b>가
            필요합니다. 공지는 사실 고지 형태로 작성하세요.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label>대상</Label>
          <div className="flex gap-2">
            {TARGETS.map((t) => (
              <Button
                key={t.value}
                type="button"
                variant={target === t.value ? "default" : "outline"}
                onClick={() => setTarget(t.value)}
              >
                {t.label}
              </Button>
            ))}
          </div>
          <p className="text-muted-foreground text-sm">
            {TARGETS.find((t) => t.value === target)?.hint}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notice-title">제목</Label>
          <Input
            id="notice-title"
            value={title}
            maxLength={NOTICE_TITLE_MAX}
            placeholder="예) 서버 점검 안내"
            onChange={(e) => setTitle(e.target.value)}
          />
          <p className="text-muted-foreground text-right text-xs">
            {title.length} / {NOTICE_TITLE_MAX}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notice-body">내용</Label>
          <Textarea
            id="notice-body"
            value={body}
            rows={4}
            maxLength={NOTICE_BODY_MAX}
            placeholder="예) 8월 10일 새벽 2시부터 1시간 동안 점검이 진행됩니다."
            onChange={(e) => setBody(e.target.value)}
          />
          <p className="text-muted-foreground text-right text-xs">
            {body.length} / {NOTICE_BODY_MAX}
          </p>
        </div>

        <div className="space-y-2">
          <div className="bg-muted/50 flex items-center justify-between rounded-md px-4 py-3">
            <span className="text-sm font-medium">발송 대상</span>
            {preview.isLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : preview.isError ? (
              <span className="text-destructive text-sm">
                대상 수를 불러오지 못했습니다
              </span>
            ) : (
              <span className="text-lg font-semibold">
                {(preview.data ?? 0).toLocaleString()} 명
              </span>
            )}
          </div>
          {/* 왜 못 읽었는지가 보여야 조치가 된다 — 발송을 막는 조건이라 특히. */}
          {preview.isError && (
            <QueryError
              error={preview.error}
              onRetry={() => void preview.refetch()}
            />
          )}
        </div>

        <div className="flex justify-end">
          {/* 대상 수를 못 읽은 상태로는 보내지 않는다 — 몇 명에게 가는지 모르는
              발송이 가장 위험하다. */}
          <Button
            disabled={!canSend || preview.isLoading || preview.isError}
            onClick={openConfirm}
          >
            발송하기
          </Button>
        </div>
      </CardContent>

      {/* 2단계 확인 — 전체 발송은 되돌릴 수 없다. */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-destructive size-4" />
              {(preview.data ?? 0).toLocaleString()}명에게 즉시 발송됩니다
            </DialogTitle>
            <DialogDescription>
              되돌릴 수 없습니다. 계속하려면 아래에 &quot;{CONFIRM_WORD}&quot;
              을(를) 입력하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="bg-muted/50 space-y-1 rounded-md px-4 py-3 text-sm">
              <p className="font-medium">{trimmedTitle}</p>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {trimmedBody}
              </p>
            </div>
            <Input
              value={confirmInput}
              placeholder={CONFIRM_WORD}
              onChange={(e) => setConfirmInput(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              취소
            </Button>
            <Button
              disabled={confirmInput.trim() !== CONFIRM_WORD || sending}
              onClick={send}
            >
              {sending ? "발송 중…" : "확인"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

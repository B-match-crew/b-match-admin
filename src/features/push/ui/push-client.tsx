"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PUSH_NIGHT_END_HOUR,
  PUSH_NIGHT_START_HOUR,
} from "@/src/shared/config/constants";
import { toUserMessage } from "@/src/shared/lib/error-codes";
import {
  sendPushAction,
  sendTestPushAction,
} from "@/src/features/push/actions";
import type { PushTarget } from "@/src/shared/api/edge";

const schema = z.object({
  target: z.enum(["ALL", "HOSTS", "GUESTS", "USERS"]),
  user_ids_text: z.string().optional(),
  title: z.string().trim().min(1, "제목을 입력하세요").max(50),
  body: z.string().trim().min(1, "본문을 입력하세요").max(500),
  deeplink_route: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function isNightTime(): boolean {
  const h = new Date().getHours();
  return h >= PUSH_NIGHT_START_HOUR || h < PUSH_NIGHT_END_HOUR;
}

export function PushClient() {
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null);
  const [lastResult, setLastResult] = useState<{
    sent: number;
    db: number;
    target: string;
  } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      target: "ALL",
      user_ids_text: "",
      title: "",
      body: "",
      deeplink_route: "/",
    },
  });

  const target = form.watch("target");

  const parseUserIds = (text?: string): string[] => {
    if (!text) return [];
    return text
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  const doSend = async (values: FormValues) => {
    setPending(true);
    try {
      const userIds = parseUserIds(values.user_ids_text);
      if (values.target === "USERS" && userIds.length === 0) {
        throw new Error("USERS 타겟은 user_id 목록이 필요합니다");
      }
      const res = await sendPushAction({
        target: values.target as PushTarget,
        user_ids: userIds,
        title: values.title,
        body: values.body,
        deeplink_route: values.deeplink_route,
      });
      setLastResult(res);
      toast.success(`발송 완료: ${res.sent}건 (DB ${res.db}건)`);
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setPending(false);
      setConfirmOpen(false);
      setPendingValues(null);
    }
  };

  const onSubmit = (values: FormValues) => {
    if (isNightTime()) {
      setPendingValues(values);
      setConfirmOpen(true);
      return;
    }
    doSend(values);
  };

  const handleTest = async () => {
    const v = form.getValues();
    if (!v.title || !v.body) {
      toast.error("제목과 본문을 먼저 입력하세요");
      return;
    }
    setPending(true);
    try {
      const res = await sendTestPushAction({ title: v.title, body: v.body });
      toast.success(`테스트 발송 완료: ${res.sent}건`);
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>알림 작성</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="target">발송 대상</Label>
              <Select
                value={target}
                onValueChange={(v) =>
                  form.setValue("target", v as FormValues["target"])
                }
              >
                <SelectTrigger id="target">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">전체 유저</SelectItem>
                  <SelectItem value="HOSTS">호스트만</SelectItem>
                  <SelectItem value="GUESTS">게스트만</SelectItem>
                  <SelectItem value="USERS">특정 유저 (UUID 입력)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {target === "USERS" && (
              <div className="space-y-1.5">
                <Label htmlFor="user_ids">User IDs (UUID, 콤마/줄바꿈 구분)</Label>
                <Textarea
                  id="user_ids"
                  rows={3}
                  placeholder="aaaa-... , bbbb-..."
                  {...form.register("user_ids_text")}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="title">제목 (≤50자)</Label>
              <Input id="title" {...form.register("title")} />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="body">본문 (≤500자)</Label>
              <Textarea id="body" rows={5} {...form.register("body")} />
              {form.formState.errors.body && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.body.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deeplink">딥링크 경로 (선택)</Label>
              <Input
                id="deeplink"
                placeholder="/"
                {...form.register("deeplink_route")}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                발송
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={handleTest}
              >
                테스트 발송 (본인)
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>발송 결과</CardTitle>
        </CardHeader>
        <CardContent>
          {lastResult ? (
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">타겟</dt>
                <dd className="font-medium">{lastResult.target}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">실제 발송</dt>
                <dd className="font-medium">{lastResult.sent}건</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">DB 알림 생성</dt>
                <dd className="font-medium">{lastResult.db}건</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              발송 후 결과가 표시됩니다.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>야간 발송 확인</DialogTitle>
            <DialogDescription>
              현재 야간 시간대 ({PUSH_NIGHT_START_HOUR}시 ~{" "}
              {PUSH_NIGHT_END_HOUR}시)입니다. 정말 발송하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => pendingValues && doSend(pendingValues)}
            >
              발송 강행
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

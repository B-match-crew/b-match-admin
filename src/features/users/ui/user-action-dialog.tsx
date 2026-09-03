"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/shared/ui/kit/dialog";
import { Button } from "@/src/shared/ui/kit/button";
import { Input } from "@/src/shared/ui/kit/input";
import { Label } from "@/src/shared/ui/kit/label";
import { Textarea } from "@/src/shared/ui/kit/textarea";
import { useAuth } from "@/src/app/providers/auth-provider";
import { REASON_MIN_LENGTH } from "@/src/shared/config/constants";
import { WarningBox } from "@/src/shared/ui/warning-box";
import {
  suspendUserAction,
  banUserAction,
} from "../api/actions";
import type {
  UserListItem,
} from "../model/actions";

interface Props {
  user: UserListItem | null;
  mode: "suspend" | "ban" | null;
  onClose: () => void;
  onDone: () => void;
}

const reason = z
  .string()
  .trim()
  .min(REASON_MIN_LENGTH, `사유는 ${REASON_MIN_LENGTH}자 이상 입력해야 합니다`)
  .max(500);

const suspendSchema = z.object({
  until: z.string().min(1, "정지 종료일을 선택하세요"),
  reason,
});
type SuspendForm = z.infer<typeof suspendSchema>;

const banSchema = z.object({ reason });
type BanForm = z.infer<typeof banSchema>;

export function UserActionDialog({ user, mode, onClose, onDone }: Props) {
  const { role } = useAuth();
  const open = !!user && !!mode;

  if (mode === "ban" && role !== "SUPER_ADMIN") {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "suspend" ? "유저 정지" : "유저 영구차단"}
          </DialogTitle>
          <DialogDescription>
            {user?.nickname ?? user?.name ?? user?.id}
          </DialogDescription>
        </DialogHeader>
        {mode === "suspend" && user && (
          <SuspendForm user={user} onDone={onDone} />
        )}
        {mode === "ban" && user && <BanForm user={user} onDone={onDone} />}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SuspendForm({
  user,
  onDone,
}: {
  user: UserListItem;
  onDone: () => void;
}) {
  const form = useForm<SuspendForm>({
    resolver: zodResolver(suspendSchema),
    defaultValues: { until: "", reason: "" },
  });

  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    form.setValue("until", d.toISOString().slice(0, 16));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (v: SuspendForm) => {
    const r = await suspendUserAction({
      userId: user.id,
      until: new Date(v.until).toISOString(),
      reason: v.reason,
    });
    if (!r.ok) {
      toast.error(r.error.message);
      return;
    }
    onDone();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="until">정지 종료일</Label>
        <Input
          id="until"
          type="datetime-local"
          {...form.register("until")}
        />
        {form.formState.errors.until && (
          <p className="text-xs text-destructive">
            {form.formState.errors.until.message}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reason">정지 사유 (10자 이상)</Label>
        <Textarea id="reason" rows={3} {...form.register("reason")} />
        {form.formState.errors.reason && (
          <p className="text-xs text-destructive">
            {form.formState.errors.reason.message}
          </p>
        )}
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        정지 처리
      </Button>
    </form>
  );
}

function BanForm({
  user,
  onDone,
}: {
  user: UserListItem;
  onDone: () => void;
}) {
  const form = useForm<BanForm>({
    resolver: zodResolver(banSchema),
    defaultValues: { reason: "" },
  });

  const onSubmit = async (v: BanForm) => {
    const r = await banUserAction({ userId: user.id, reason: v.reason });
    if (!r.ok) {
      toast.error(r.error.message);
      return;
    }
    onDone();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <WarningBox>
        ⚠ 영구차단은 되돌릴 수 없습니다. CI 해시가 영구 블랙리스트에 등록되며,
        해당 유저가 호스트라면 모든 모임이 강제 삭제됩니다.
      </WarningBox>
      <div className="space-y-1.5">
        <Label htmlFor="ban-reason">차단 사유 (10자 이상)</Label>
        <Textarea id="ban-reason" rows={3} {...form.register("reason")} />
        {form.formState.errors.reason && (
          <p className="text-xs text-destructive">
            {form.formState.errors.reason.message}
          </p>
        )}
      </div>
      <Button
        type="submit"
        variant="destructive"
        disabled={form.formState.isSubmitting}
      >
        영구차단 처리
      </Button>
    </form>
  );
}

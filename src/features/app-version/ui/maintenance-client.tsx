"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Wrench } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/shared/ui/kit/card";
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
import { Switch } from "@/src/shared/ui/kit/switch";
import { Checkbox } from "@/src/shared/ui/kit/checkbox";
import { Badge } from "@/src/shared/ui/kit/badge";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { Alert, AlertDescription } from "@/src/shared/ui/kit/alert";
import {
  formatKst,
  toKstInputValue,
  fromKstInputValue,
} from "@/src/shared/lib/format-date";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import {
  fetchAppStatus,
  setMaintenanceAction,
  type AppStatusRow,
} from "../maintenance-actions";

/** 확인 모달 단계 — 전 사용자를 잠그는 조작이라 2단계로 되묻는다. */
type ConfirmStep = null | "first" | "second";

export function MaintenanceClient() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["app-status"],
    queryFn: () => unwrap(fetchAppStatus()),
  });

  if (isError) {
    return (
      <QueryError
        section="서버 점검"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }
  if (isLoading || !data) return <Skeleton className="h-72" />;
  return <MaintenanceCard row={data} onSaved={() => queryClient.invalidateQueries({ queryKey: ["app-status"] })} />;
}

function MaintenanceCard({
  row,
  onSaved,
}: {
  row: AppStatusRow;
  onSaved: () => void;
}) {
  const enabled = row.maintenance_enabled;
  const [startAt, setStartAt] = useState(
    row.maintenance_start_at ? toKstInputValue(row.maintenance_start_at) : ""
  );
  const [endAt, setEndAt] = useState(
    row.maintenance_end_at ? toKstInputValue(row.maintenance_end_at) : ""
  );
  const [autoResume, setAutoResume] = useState(row.auto_resume);
  const [step, setStep] = useState<ConfirmStep>(null);
  const [saving, setSaving] = useState(false);

  /** 시간이 모두 입력돼야 켤 수 있다 (요구사항: 시간 입력 후에만 토글 가능). */
  const canEnable = startAt !== "" && endAt !== "";

  const run = async (p: {
    enabled: boolean;
    startAt?: string | null;
    endAt?: string | null;
    autoResume?: boolean;
  }) => {
    setSaving(true);
    try {
      const r = await setMaintenanceAction(p);
      if (!r.ok) {
        toast.error(r.error.message);
        return;
      }
      toast.success(
        p.enabled ? "서버 점검을 시작했습니다" : "서버 점검을 해제했습니다"
      );
      setStep(null);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  /** 토글 — 켤 때만 2단계 확인, 끌 때는 1단계 확인. */
  const onToggle = (next: boolean) => {
    if (next && !canEnable) {
      toast.error("점검 시작/예상 종료 시각을 먼저 입력해주세요");
      return;
    }
    setStep("first");
  };

  /** 점검 중 예상 종료 시각 연장 (토글 유지). */
  const onExtend = () =>
    run({
      enabled: true,
      startAt: fromKstInputValue(startAt),
      endAt: fromKstInputValue(endAt),
      autoResume,
    });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                서버 점검 모드
                {enabled && <Badge variant="destructive">점검 중</Badge>}
              </CardTitle>
              <CardDescription>
                켜면 사용자는 앱에 진입할 수 없고 &quot;서버 점검 중입니다&quot;
                안내를 봅니다. 점검 여부는 서버 시각으로 판정됩니다.
              </CardDescription>
            </div>
            <Switch
              checked={enabled}
              disabled={saving}
              onCheckedChange={onToggle}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {enabled && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                현재 점검 중입니다. 시작 {formatKst(row.maintenance_start_at!)} /
                완료 예정 {formatKst(row.maintenance_end_at!)}
                {row.auto_resume
                  ? " — 예정 시각이 지나면 자동으로 해제됩니다."
                  : " — 자동 해제되지 않습니다. 직접 토글을 꺼야 합니다."}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maintenance-start">점검 시작 (KST)</Label>
              <Input
                id="maintenance-start"
                type="datetime-local"
                value={startAt}
                disabled={saving}
                onChange={(e) => setStartAt(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                미래로 지정하면 예약 점검이 됩니다.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintenance-end">완료 예정 (KST)</Label>
              <Input
                id="maintenance-end"
                type="datetime-local"
                value={endAt}
                disabled={saving}
                onChange={(e) => setEndAt(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                사용자에게 안내되는 시각입니다. 최대 7일.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="auto-resume"
              checked={autoResume}
              disabled={saving}
              onCheckedChange={(v) => setAutoResume(v === true)}
            />
            <div className="space-y-1">
              <Label htmlFor="auto-resume">완료 예정 시각에 자동 재개</Label>
              <p className="text-muted-foreground text-xs">
                끄면 예정 시각이 지나도 점검이 유지됩니다. 점검이 길어질 때
                의도치 않게 서비스가 열리는 것을 막습니다.
              </p>
            </div>
          </div>

          {enabled && (
            <div className="flex justify-end">
              <Button variant="outline" disabled={saving} onClick={onExtend}>
                시간/설정 변경 저장
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 1단계 확인 */}
      <Dialog
        open={step === "first"}
        onOpenChange={(o) => !o && setStep(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {enabled ? "점검을 해제할까요?" : "서버 점검을 시작할까요?"}
            </DialogTitle>
            <DialogDescription>
              {enabled
                ? "해제하면 사용자가 다시 앱에 접속할 수 있습니다."
                : "점검을 시작하면 해당 시간 동안 사용자가 앱에 접속할 수 없습니다. 정말 실행하시나요?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStep(null)}>
              취소
            </Button>
            <Button
              variant={enabled ? "default" : "destructive"}
              onClick={() =>
                enabled ? run({ enabled: false }) : setStep("second")
              }
              disabled={saving}
            >
              예
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2단계 확인 — 켤 때만 (예상 종료 시각 재확인) */}
      <Dialog
        open={step === "second"}
        onOpenChange={(o) => !o && setStep(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>예상 종료 시각을 다시 확인해 주세요</DialogTitle>
            <DialogDescription>
              시작 {startAt ? formatKst(fromKstInputValue(startAt)) : "-"} /
              완료 예정 {endAt ? formatKst(fromKstInputValue(endAt)) : "-"}
              {autoResume
                ? " — 완료 예정 시각에 자동 재개됩니다."
                : " — 자동 재개가 꺼져 있어 직접 해제해야 합니다."}
              <br />이 시간 동안 모든 사용자의 앱 접속이 차단됩니다. 정말
              실행하시나요?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStep(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              disabled={saving}
              onClick={() =>
                run({
                  enabled: true,
                  startAt: fromKstInputValue(startAt),
                  endAt: fromKstInputValue(endAt),
                  autoResume,
                })
              }
            >
              점검 시작
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

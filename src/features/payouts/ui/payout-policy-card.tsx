"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/src/shared/ui/kit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { InfoField, InfoGrid } from "@/src/shared/ui/info-field";
import { ReasonDialog } from "@/src/shared/ui/reason-dialog";
import { WarningBox } from "@/src/shared/ui/warning-box";
import { useAuth } from "@/src/app/providers/auth-provider";
import { setPayoutsEnabledAction } from "../api/actions";
import { policyRows } from "../model/status";
import type { PayoutOverview } from "../model/types";
import { ProvisionalBadge } from "./payout-badge";

/**
 * 정산 정책 · 킬 스위치. 🟡 policy.provisional 이면 결정(D13 · D14 · D15 · D16 · P18) 전의 임시 기본값으로 돌고 있다 —
 * 줄마다 "임시" 를 붙이고 위에 경고를 띄운다. 값은 SQL Editor 에서만 바꾼다(138 머리말).
 */
export function PayoutPolicyCard({ data }: { data: PayoutOverview }) {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<boolean | null>(null);
  const rows = policyRows(data.policy);

  return (
    <Card>
      <CardHeader>
        <CardTitle>정산 정책</CardTitle>
        <CardDescription>
          환경 <b>{data.pg_env}</b> · 정산 {data.enabled ? "켜짐" : "꺼짐"} · 등록된 정산 계좌 {data.accounts}개
          {data.pg_env === "TEST" && " · TEST 는 이체 금액이 1,000원으로 고정됩니다(페이플 R0113)"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.policy.provisional && (
          <WarningBox tone="caution">
            <b>임시 기본값으로 운영 중</b> — 수수료 · 보류 기간 · 원천징수 · 정지 모임장 처리는 아직 결정 전입니다
            (세무사 · 법무 확인 후 확정). 확정되면 값을 바꾸고 이 표시를 끕니다.
          </WarningBox>
        )}
        <InfoGrid columns={3}>
          {rows.map((r) => (
            <InfoField key={r.label} label={r.label}>
              <span className="inline-flex flex-wrap items-center gap-1.5">
                {r.value}
                {r.decision && <ProvisionalBadge decision={r.decision} />}
              </span>
            </InfoField>
          ))}
        </InfoGrid>
        {role === "SUPER_ADMIN" && (
          <Button variant={data.enabled ? "destructive" : "default"} onClick={() => setPending(!data.enabled)}>
            {data.enabled ? "정산 끄기(킬 스위치)" : "정산 켜기"}
          </Button>
        )}
        <ReasonDialog
          open={pending !== null}
          title={pending ? "정산 켜기" : "정산 끄기(킬 스위치)"}
          warning={
            pending === false ? (
              <WarningBox>새 이체를 멈춥니다. 이미 페이플에 보낸 이체의 결과(웹훅)는 계속 반영됩니다.</WarningBox>
            ) : undefined
          }
          confirmLabel="저장"
          destructive={pending === false}
          onClose={() => setPending(null)}
          onSubmit={async (reason) => {
            if (pending === null) return false;
            const r = await setPayoutsEnabledAction({ enabled: pending, reason });
            if (!r.ok) {
              toast.error(r.error.message);
              return false;
            }
            toast.success(r.data.enabled ? "정산을 켰습니다" : "정산을 껐습니다");
            void queryClient.invalidateQueries({ queryKey: ["payout-overview"] });
            return true;
          }}
        />
      </CardContent>
    </Card>
  );
}

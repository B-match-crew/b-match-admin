"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/src/shared/ui/kit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Input } from "@/src/shared/ui/kit/input";
import { Label } from "@/src/shared/ui/kit/label";
import { InfoField, InfoGrid } from "@/src/shared/ui/info-field";
import { WarningBox } from "@/src/shared/ui/warning-box";
import { useAuth } from "@/src/app/providers/auth-provider";
import { setPaymentSettingsAction } from "../api/actions";
import { won } from "../model/status";
import type { PaymentOverview } from "../model/types";
import { PaymentReasonDialog } from "./payment-reason-dialog";

/**
 * 결제 설정 — 킬 스위치(신규 주문 차단) · 테스트 금액 · 최대 금액. 바꾸는 것은 SUPER_ADMIN + 사유.
 * 킬 스위치는 **새 주문만** 막는다 — 이미 인증까지 끝난 결제는 서버가 마저 승인한다(결제 계획서 §4.14).
 */
export function PaymentSettingsCard({ settings }: { settings: PaymentOverview["settings"] }) {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<{
    paymentsEnabled?: boolean;
    testAmount?: number;
    maxAmount?: number;
  } | null>(null);
  const [testAmount, setTestAmount] = useState(String(settings.test_amount));
  const [maxAmount, setMaxAmount] = useState(String(settings.max_amount));
  const isSuper = role === "SUPER_ADMIN";

  return (
    <Card>
      <CardHeader>
        <CardTitle>결제 설정</CardTitle>
        <CardDescription>
          환경 <b>{settings.pg_env}</b> · 주문 유효 {settings.order_ttl_minutes}분 · 결제창 도메인{" "}
          {settings.checkout_origin ?? "미설정"} · clientKey {settings.client_key_set ? "설정됨" : "미설정"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!settings.payments_enabled && (
          <WarningBox>결제가 꺼져 있습니다 — 새 주문을 받지 않습니다.</WarningBox>
        )}
        <InfoGrid columns={3}>
          <InfoField label="결제">{settings.payments_enabled ? "켜짐" : "꺼짐(킬 스위치)"}</InfoField>
          <InfoField label="테스트 금액">{won(settings.test_amount)}</InfoField>
          <InfoField label="최대 금액">{won(settings.max_amount)}</InfoField>
          <InfoField label="시도 제한">
            10분 {settings.attempt_limit_10m} · 하루 {settings.attempt_limit_day} · 테스트 10분{" "}
            {settings.test_attempt_limit_10m}
          </InfoField>
          <InfoField label="연속 실패 차단">
            {settings.fail_streak_limit}회 → {settings.fail_block_minutes}분
          </InfoField>
          <InfoField label="강제 환불 하루 상한">
            {settings.admin_refund_daily_count}건 · {won(settings.admin_refund_daily_amount)}
          </InfoField>
        </InfoGrid>

        {isSuper && (
          <div className="flex flex-wrap items-end gap-3">
            <Button
              variant={settings.payments_enabled ? "destructive" : "default"}
              onClick={() => setPending({ paymentsEnabled: !settings.payments_enabled })}
            >
              {settings.payments_enabled ? "결제 끄기(킬 스위치)" : "결제 켜기"}
            </Button>
            <div className="space-y-1">
              <Label htmlFor="pay-test-amount">테스트 금액</Label>
              <Input
                id="pay-test-amount"
                type="number"
                min={100}
                className="w-32"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pay-max-amount">최대 금액</Label>
              <Input
                id="pay-max-amount"
                type="number"
                min={100}
                className="w-36"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                const t = Number(testAmount);
                const m = Number(maxAmount);
                if (!Number.isInteger(t) || !Number.isInteger(m)) {
                  toast.error("금액은 정수로 입력해 주세요");
                  return;
                }
                setPending({ testAmount: t, maxAmount: m });
              }}
            >
              금액 저장
            </Button>
          </div>
        )}

        <PaymentReasonDialog
          open={pending !== null}
          title={
            pending?.paymentsEnabled === false
              ? "결제 끄기(킬 스위치)"
              : pending?.paymentsEnabled === true
                ? "결제 켜기"
                : "결제 금액 변경"
          }
          warning={
            pending?.paymentsEnabled === false ? (
              <WarningBox>새 주문을 막습니다. 이미 인증까지 끝난 결제는 서버가 마저 처리합니다.</WarningBox>
            ) : undefined
          }
          confirmLabel="저장"
          destructive={pending?.paymentsEnabled === false}
          onClose={() => setPending(null)}
          onSubmit={async (reason) => {
            if (!pending) return false;
            const r = await setPaymentSettingsAction({ ...pending, reason });
            if (!r.ok) {
              toast.error(r.error.message);
              return false;
            }
            toast.success("결제 설정을 바꿨습니다");
            void queryClient.invalidateQueries({ queryKey: ["payment-overview"] });
            return true;
          }}
        />
      </CardContent>
    </Card>
  );
}

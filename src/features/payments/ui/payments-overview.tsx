"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/src/shared/ui/kit/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { QueryError } from "@/src/shared/ui/query-error";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { kstRange } from "@/src/shared/lib/kst-range";
import { unwrap } from "@/src/shared/lib/unwrap";
import { cn } from "@/src/shared/lib/cn";
import { fetchPaymentOverview } from "../api/actions";
import { ALERT_LABELS, queueAttention, won } from "../model/status";
import { PaymentSettingsCard } from "./payment-settings-card";
import { isPaymentsMissing, PaymentsUnavailable } from "./payments-unavailable";

/**
 * 운영 큐(기대값 0) · 퍼널 · 설정 · 최근 경보(결제 계획서 §8.3 · §8.5).
 * 큐 숫자가 0 이 아니면 사람이 볼 일이다 — 해당 상태로 목록을 걸러 상세에서 조치한다.
 */
export function PaymentsOverview({ onOpenOrder }: { onOpenOrder: (orderNo: string) => void }) {
  const [days] = useState(7);
  const range = kstRange(days);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["payment-overview", range.from, range.to],
    queryFn: () => unwrap(fetchPaymentOverview({ dateFrom: range.from, dateTo: range.to })),
    refetchInterval: 60_000,
  });

  if (isError) {
    return isPaymentsMissing(error) ? (
      <PaymentsUnavailable />
    ) : (
      <QueryError section="결제 운영" error={error} onRetry={() => void refetch()} />
    );
  }
  if (isLoading || !data) return <Skeleton className="h-64" />;

  const q = data.queue;
  const attention = queueAttention(q);
  const tiles: Array<{ label: string; value: number; hint: string; bad?: boolean }> = [
    { label: "승인 결과 모름", value: q.approval_unknown, hint: "reconcile 이 1분마다 조회", bad: q.approval_unknown > 0 },
    { label: "승인 응답 2분+", value: q.approving_stale, hint: "Edge 가 멈췄는지", bad: q.approving_stale > 0 },
    { label: "환불 결과 모름", value: q.refund_unknown, hint: "다건 조회로 확인 중", bad: q.refund_unknown > 0 },
    { label: "환불 실패", value: q.refund_failed, hint: "수기 처리 · 재시도", bad: q.refund_failed > 0 },
    { label: "자동 환불 진행", value: q.extra_refund_open, hint: "이중 승인 · 재결제 뒤 늦은 승인", bad: q.extra_refund_open > 0 },
    { label: "오래된 결제 대기", value: q.old_ready, hint: "만료 cron 이 멈췄는지", bad: q.old_ready > 0 },
    { label: "환불 중", value: q.refunding, hint: "흐르는 중" },
    { label: "안 보낸 경보", value: q.alerts_unsent, hint: "Slack 웹훅 · reconcile" },
  ];
  const f = data.funnel;

  return (
    <div className="space-y-6">
      {attention > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription>
            사람이 봐야 하는 결제가 <b>{attention}건</b> 있습니다. 결제 목록에서 그 상태로 걸러 상세를 여세요.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>운영 큐</CardTitle>
          <CardDescription>정상이면 위의 여섯 칸은 0 입니다. 1분마다 다시 읽습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            {tiles.map((t) => (
              <div
                key={t.label}
                className={cn(
                  "rounded-lg border p-3",
                  t.bad && "border-bds-status-error/40 bg-bds-status-error-subtle"
                )}
              >
                <div className="text-bds-caption2 text-bds-label-assistive">{t.label}</div>
                <div className="mt-0.5 text-bds-title3 tabular-nums">{t.value.toLocaleString()}</div>
                <div className="text-bds-caption2 text-bds-label-alternative">{t.hint}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>최근 {days}일 퍼널</CardTitle>
          <CardDescription>주문 생성 시각 기준 (KST {range.from} ~ {range.to})</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-5">
            {[
              ["주문", f.orders],
              ["결제창", f.opened],
              ["인증", f.authed],
              ["결제", f.paid],
              ["환불", f.refunded],
            ].map(([label, n]) => (
              <div key={label as string} className="rounded-lg border p-3">
                <div className="text-bds-caption2 text-bds-label-assistive">{label}</div>
                <div className="mt-0.5 text-bds-title3 tabular-nums">{(n as number).toLocaleString()}</div>
                <div className="text-bds-caption2 text-bds-label-alternative">
                  {f.orders > 0 ? `${Math.round(((n as number) / f.orders) * 100)}%` : "-"}
                </div>
              </div>
            ))}
          </div>
          <p className="text-bds-caption1 text-bds-label-alternative">
            결제 {won(f.amount_paid)} · 환불 {won(f.amount_refunded)} · 시도 상태{" "}
            {Object.entries(data.attempts)
              .map(([k, v]) => `${k} ${v}`)
              .join(" · ") || "-"}
          </p>
        </CardContent>
      </Card>

      <PaymentSettingsCard settings={data.settings} />

      <Card>
        <CardHeader>
          <CardTitle>최근 경보</CardTitle>
          <CardDescription>Slack 결제 채널로도 갑니다(SLACK_PAYMENT_WEBHOOK_URL 이 있을 때).</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recent_alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">경보가 없습니다.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {data.recent_alerts.map((a, i) => (
                <li key={i} className="flex flex-wrap gap-x-2">
                  <span className="text-muted-foreground">{formatDateTime(a.created_at)}</span>
                  <span className="font-medium">{ALERT_LABELS[a.kind] ?? a.kind}</span>
                  {a.order_no && (
                    <button
                      type="button"
                      className="font-mono text-xs underline"
                      onClick={() => onOpenOrder(a.order_no!)}
                    >
                      {a.order_no}
                    </button>
                  )}
                  {!a.sent_at && <span className="text-bds-status-warning-text">미발송</span>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

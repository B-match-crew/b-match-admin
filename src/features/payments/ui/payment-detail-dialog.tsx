"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/src/shared/ui/kit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/shared/ui/kit/dialog";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/shared/ui/kit/table";
import { InfoField, InfoGrid } from "@/src/shared/ui/info-field";
import { QueryError } from "@/src/shared/ui/query-error";
import { WarningBox } from "@/src/shared/ui/warning-box";
import { useAuth } from "@/src/app/providers/auth-provider";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { unwrap } from "@/src/shared/lib/unwrap";
import {
  fetchPaymentDetail,
  forceRefundAction,
  recheckPaymentAction,
  retryRefundAction,
} from "../api/actions";
import {
  ALERT_LABELS,
  canForceRefund,
  canRecheck,
  canRetryRefund,
  newRequestKey,
  won,
} from "../model/status";
import { PaymentStatusBadge } from "./payment-status-badge";
import { PaymentReasonDialog } from "./payment-reason-dialog";

/**
 * 결제 상세 — 주문 · 시도 · 상태 이력 · 환불 · 경보 + 조치(재조회 · 강제 환불 · 환불 재시도).
 *
 * 조치는 서버가 다시 판정한다(권한 · 상태 · 하루 상한). 버튼은 그 판정을 미리 보여 줄 뿐이다.
 * 돈이 움직이는 조치는 환불 큐에 넣고 끝난다 — 1분 안에 Edge 가 취소를 실행하므로 결과는 다시 열어 본다.
 */
export function PaymentDetailDialog({
  orderNo,
  onClose,
}: {
  orderNo: string | null;
  onClose: () => void;
}) {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [action, setAction] = useState<"refund" | "retry" | null>(null);
  // 다이얼로그가 열려 있는 동안 같은 키 — 타임아웃 뒤 다시 눌러도 서버가 같은 요청으로 묶는다
  const requestKey = useMemo(
    () => (action ? newRequestKey(`admin-${action}`) : ""),
    [action]
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["payment-detail", orderNo],
    queryFn: () => unwrap(fetchPaymentDetail(orderNo!)),
    enabled: !!orderNo,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["payment-detail", orderNo] });
    void queryClient.invalidateQueries({ queryKey: ["payments"] });
    void queryClient.invalidateQueries({ queryKey: ["payment-overview"] });
  };

  const recheck = async () => {
    if (!orderNo) return;
    const r = await recheckPaymentAction(orderNo);
    if (!r.ok) return toast.error(r.error.message);
    toast.success(
      `다음 분 reconcile 이 다시 묻습니다 (시도 ${r.data.attempts} · 환불 ${r.data.refunds})`
    );
    invalidate();
  };

  const order = data?.order;
  const isSuper = role === "SUPER_ADMIN";

  return (
    <Dialog open={!!orderNo} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            결제 상세 {order && <PaymentStatusBadge status={order.status} />}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">{orderNo}</DialogDescription>
        </DialogHeader>

        {isLoading && <Skeleton className="h-64" />}
        {isError && <QueryError section="결제 상세" error={error} onRetry={() => void refetch()} />}
        {!isLoading && !isError && !data && <p className="text-sm">결제를 찾을 수 없습니다.</p>}

        {data && order && (
          <div className="space-y-5">
            {order.pg_env === "LIVE" && (
              <WarningBox>운영(LIVE) 결제입니다 — 환불하면 실제 돈이 돌아갑니다.</WarningBox>
            )}
            <InfoGrid columns={3}>
              <InfoField label="금액">{won(order.amount)}</InfoField>
              <InfoField label="환불액">{won(order.refunded_amount)}</InfoField>
              <InfoField label="환경 · 목적">
                {order.pg_env} · {order.purpose}
              </InfoField>
              <InfoField label="결제자">
                {order.payer?.nickname ?? "-"} (#{order.user_id ?? "파기됨"})
                {order.user_deleted ? " · 탈퇴" : ""}
              </InfoField>
              <InfoField label="모집글">
                {order.target?.title ?? "-"} (#{order.target_id})
              </InfoField>
              <InfoField label="승인 시도">{order.approved_oid ?? "-"}</InfoField>
              <InfoField label="생성">{formatDateTime(order.created_at)}</InfoField>
              <InfoField label="승인">{order.approved_at ? formatDateTime(order.approved_at) : "-"}</InfoField>
              <InfoField label="실패 코드">
                {order.fail_code ? `${order.fail_code} ${order.fail_message ?? ""}` : "-"}
              </InfoField>
            </InfoGrid>

            <div className="flex flex-wrap gap-2">
              {canRecheck(order) && (
                <Button size="sm" variant="outline" onClick={() => void recheck()}>
                  상태 재조회
                </Button>
              )}
              {isSuper && canForceRefund(order) && (
                <Button size="sm" variant="destructive" onClick={() => setAction("refund")}>
                  강제 환불(전액)
                </Button>
              )}
              {isSuper && canRetryRefund(order) && (
                <Button size="sm" variant="destructive" onClick={() => setAction("retry")}>
                  환불 재시도
                </Button>
              )}
            </div>

            <section className="space-y-2">
              <h3 className="text-bds-heading3">결제창 시도 ({data.attempts.length})</h3>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>페이플 주문번호</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>코드</TableHead>
                      <TableHead>카드</TableHead>
                      <TableHead>승인번호 · 거래키</TableHead>
                      <TableHead>인증</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.attempts.map((a) => (
                      <TableRow key={a.oid}>
                        <TableCell className="font-mono text-xs">{a.oid}</TableCell>
                        <TableCell className="text-xs">{a.status}</TableCell>
                        <TableCell className="text-xs">
                          {a.auth_code ?? "-"}
                          {a.auth_message ? ` · ${a.auth_message}` : ""}
                        </TableCell>
                        <TableCell className="text-xs">
                          {[a.card_name, a.card_num_masked].filter(Boolean).join(" ") || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {a.pg_auth_no ?? "-"} · {a.pg_trade_no ?? "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {a.authed_at ? formatDateTime(a.authed_at) : "-"}
                          {a.reconcile_attempts > 0 ? ` · 조회 ${a.reconcile_attempts}회` : ""}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            {data.refunds.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-bds-heading3">환불 ({data.refunds.length})</h3>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>종류</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead className="text-right">금액</TableHead>
                        <TableHead>요청</TableHead>
                        <TableHead>사유</TableHead>
                        <TableHead>페이플</TableHead>
                        <TableHead>요청 시각</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.refunds.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs">{r.kind === "ORDER" ? "주문" : "이중 승인"}</TableCell>
                          <TableCell className="text-xs">{r.status}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">{won(r.amount)}</TableCell>
                          <TableCell className="text-xs">
                            {r.requested_by_type}
                            {r.requested_by_id ? ` #${r.requested_by_id}` : ""}
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.reason_code}
                            {r.reason_text ? ` · ${r.reason_text}` : ""}
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.pg_code ?? "-"} · 시도 {r.attempts}
                          </TableCell>
                          <TableCell className="text-xs">{formatDateTime(r.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>
            )}

            <section className="space-y-2">
              <h3 className="text-bds-heading3">상태 이력 ({data.events.length})</h3>
              <ol className="space-y-1 text-xs">
                {data.events.map((e, i) => (
                  <li key={i} className="flex flex-wrap gap-x-2 border-b py-1">
                    <span className="text-muted-foreground">{formatDateTime(e.at)}</span>
                    <span className="font-medium">
                      {e.from ?? "∅"} → {e.to ?? "∅"}
                    </span>
                    <span>{e.actor_type}</span>
                    {e.pg_code && <span className="font-mono">{e.pg_code}</span>}
                    {e.oid && <span className="font-mono text-muted-foreground">{e.oid.slice(-8)}</span>}
                    {Object.keys(e.detail ?? {}).length > 0 && (
                      <span className="font-mono text-muted-foreground">{JSON.stringify(e.detail)}</span>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            {data.alerts.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-bds-heading3">경보 ({data.alerts.length})</h3>
                <ul className="space-y-1 text-xs">
                  {data.alerts.map((a, i) => (
                    <li key={i}>
                      {formatDateTime(a.created_at)} · {ALERT_LABELS[a.kind] ?? a.kind}
                      {a.sent_at ? "" : " · 미발송"}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        <PaymentReasonDialog
          open={action !== null && !!order}
          title={action === "retry" ? "환불 재시도" : "강제 환불(전액)"}
          description={order ? `${orderNo} · ${won(order.amount - order.refunded_amount)}` : undefined}
          warning={
            <WarningBox>
              환불 큐에 넣습니다. <b>1분 안에</b> 페이플 취소가 실행되고, 되돌릴 수 없습니다. 오늘 강제 환불
              건수 · 금액 상한을 넘으면 거절됩니다.
            </WarningBox>
          }
          confirmLabel={action === "retry" ? "재시도" : "환불"}
          destructive
          onClose={() => setAction(null)}
          onSubmit={async (reason) => {
            if (!orderNo || !action) return false;
            const run = action === "retry" ? retryRefundAction : forceRefundAction;
            const r = await run({ orderNo, reason, requestKey });
            if (!r.ok) {
              toast.error(r.error.message);
              return false;
            }
            toast.success(
              r.data.result === "EXISTING" ? "이미 접수된 요청입니다" : "환불을 접수했습니다 — 1분 안에 실행됩니다"
            );
            invalidate();
            return true;
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

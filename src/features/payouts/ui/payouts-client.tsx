"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/src/shared/ui/kit/alert";
import { Button } from "@/src/shared/ui/kit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/shared/ui/kit/table";
import { InfoField, InfoGrid } from "@/src/shared/ui/info-field";
import { QueryError } from "@/src/shared/ui/query-error";
import { ReasonDialog } from "@/src/shared/ui/reason-dialog";
import { WarningBox } from "@/src/shared/ui/warning-box";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { unwrap } from "@/src/shared/lib/unwrap";
import { cn } from "@/src/shared/lib/cn";
import { useAuth } from "@/src/app/providers/auth-provider";
import { buildSettlementsAction, fetchPayoutBalance, fetchPayoutOverview } from "../api/actions";
import { HOLD_REASON_LABELS, PAYOUT_STATUS_META, payoutAttention, won } from "../model/status";
import type { HoldReason, PayoutStatus } from "../model/types";
import { PayoutPolicyCard } from "./payout-policy-card";
import { PayoutStatusBadge, SettlementStatusBadge } from "./payout-badge";
import { isPayoutsMissing, PayoutsUnavailable } from "./payouts-unavailable";
import { SettlementDetailDialog } from "./settlement-detail-dialog";

/**
 * 정산 운영(결제 계획서 §12.8) — 정책(임시 표시) · 지급 상태 · 잔액 · 회차 만들기 · 회차 · 최근 지급 · 웹훅.
 * 회차는 만들기 → (상세에서) 승인 순서다. 승인하면 지급이 SCHEDULED 가 되고 1분 안에 Edge 가 이체한다.
 */
export function PayoutsClient() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<number | null>(null);
  const [build, setBuild] = useState<{ ignoreHold: boolean } | null>(null);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["payout-overview"],
    queryFn: () => unwrap(fetchPayoutOverview()),
    refetchInterval: 30_000,
  });
  const balance = useMutation({ mutationFn: () => unwrap(fetchPayoutBalance()) });

  if (isError) {
    return isPayoutsMissing(error) ? (
      <PayoutsUnavailable />
    ) : (
      <QueryError section="정산" error={error} onRetry={() => void refetch()} />
    );
  }
  if (isLoading || !data) return <Skeleton className="h-64" />;

  const attention = payoutAttention(data.counts);
  const isSuper = role === "SUPER_ADMIN";
  const statusTiles = (Object.keys(PAYOUT_STATUS_META) as PayoutStatus[]).map((s) => ({
    status: s,
    n: data.counts[s] ?? 0,
  }));

  return (
    <div className="space-y-6">
      {attention > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription>
            사람이 봐야 하는 지급이 <b>{attention}건</b> 있습니다(보류 · 실패 · 은행 처리 중). 아래 회차의 상세를 여세요.
          </AlertDescription>
        </Alert>
      )}

      <PayoutPolicyCard data={data} />

      <Card>
        <CardHeader>
          <CardTitle>지급 상태</CardTitle>
          <CardDescription>
            승인 대기 회차 {data.drafts}건 · 아직 회차에 안 들어간 결제 {data.pending_payments}건. 30초마다 다시 읽습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-5">
            {statusTiles.map((t) => (
              <div
                key={t.status}
                className={cn(
                  "rounded-lg border p-3",
                  t.n > 0 &&
                    ["HELD", "FAILED", "FAILED_ACCOUNT", "PROCESSING"].includes(t.status) &&
                    "border-bds-status-error/40 bg-bds-status-error-subtle"
                )}
              >
                <div className="text-bds-caption2 text-bds-label-assistive">{PAYOUT_STATUS_META[t.status].label}</div>
                <div className="mt-0.5 text-bds-title3 tabular-nums">{t.n.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>이체 가능 잔액</CardTitle>
          <CardDescription>
            Edge 가 페이플 정산지급대행에 묻습니다(고정 IP 프록시 경유). 카드 대금이 정산되기 전에는 잔액이 모자라 지급이
            보류됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" onClick={() => balance.mutate()} disabled={balance.isPending}>
            {balance.isPending ? "조회 중…" : "잔액 조회"}
          </Button>
          {balance.isError && <p className="text-sm text-destructive">{(balance.error as Error).message}</p>}
          {balance.data && (
            <InfoGrid columns={2}>
              <InfoField label="결과">
                {balance.data.result}
                {balance.data.result !== "A0000" && balance.data.message ? ` · ${balance.data.message}` : ""}
              </InfoField>
              <InfoField label="이체 가능">{won(Number(balance.data.remain_amt ?? NaN) || 0)}</InfoField>
              <InfoField label="누적 정산 · 이체">
                {won(Number(balance.data.total_account_amt ?? 0))} · {won(Number(balance.data.total_transfer_amt ?? 0))}
              </InfoField>
              <InfoField label="경로">
                {balance.data.pg_env} · {balance.data.via_proxy ? "프록시 경유" : "직결(프록시 미설정)"}
              </InfoField>
            </InfoGrid>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>회차</CardTitle>
          <CardDescription>
            회차 만들기 = 보류 기간이 지난 결제 · 지난 회차 뒤 환불 · 이월을 모임장별로 묶어 <b>승인 대기</b>로 둡니다.
            행을 눌러 상세에서 승인합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isSuper && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setBuild({ ignoreHold: false })}>회차 만들기</Button>
              {data.pg_env === "TEST" && (
                <Button variant="outline" onClick={() => setBuild({ ignoreHold: true })}>
                  보류 기간 무시하고 만들기(TEST)
                </Button>
              )}
            </div>
          )}
          {data.settlements.length === 0 ? (
            <p className="text-sm text-muted-foreground">회차가 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>모임장</TableHead>
                  <TableHead className="text-right">결제</TableHead>
                  <TableHead className="text-right">환불 · 이월 · 수수료</TableHead>
                  <TableHead className="text-right">지급액</TableHead>
                  <TableHead>지급</TableHead>
                  <TableHead>만든 시각</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.settlements.map((s) => (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => setOpenId(s.id)}>
                    <TableCell className="tabular-nums">
                      {s.id}
                      {s.ignored_hold && <span className="ml-1 text-bds-caption2 text-bds-status-warning-text">보류 무시</span>}
                    </TableCell>
                    <TableCell>
                      <SettlementStatusBadge status={s.status} />
                    </TableCell>
                    <TableCell>
                      {s.host_nickname ?? "-"} <span className="text-muted-foreground">#{s.host_user_id ?? "-"}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {won(s.gross_amount)} <span className="text-muted-foreground">({s.item_count})</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {won(s.refund_deduction)} · {won(s.carry_in)} · {won(s.fee_amount)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{won(s.net_amount)}</TableCell>
                    <TableCell>{s.payout_status ? <PayoutStatusBadge status={s.payout_status} /> : "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(s.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>최근 지급</CardTitle>
          <CardDescription>이체 1건 = 1행. 재시도는 새 행입니다(앞 건은 남습니다).</CardDescription>
        </CardHeader>
        <CardContent>
          {data.payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">지급이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>회차</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">이체 금액</TableHead>
                  <TableHead>코드</TableHead>
                  <TableHead>지급 시각</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.payouts.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => setOpenId(p.settlement_id)}>
                    <TableCell className="tabular-nums">{p.id}</TableCell>
                    <TableCell className="tabular-nums">{p.settlement_id}</TableCell>
                    <TableCell>
                      <PayoutStatusBadge status={p.status} />
                      {p.hold_reason && (
                        <span className="ml-1 text-bds-caption2 text-muted-foreground">
                          {HOLD_REASON_LABELS[p.hold_reason as HoldReason] ?? p.hold_reason}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {won(p.tran_amount)}
                      {p.tran_amount !== p.net_amount && (
                        <span className="ml-1 text-muted-foreground">(회차 {won(p.net_amount)})</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.pg_code ?? "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{p.paid_at ? formatDateTime(p.paid_at) : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>최근 정산 웹훅</CardTitle>
          <CardDescription>
            본문은 믿지 않고 페이플에 다시 물어 반영합니다. 확인 실패(VERIFY_FAILED)는 /run 의 결과 확인이 다시 봅니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.webhooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">받은 웹훅이 없습니다.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {data.webhooks.map((w) => (
                <li key={w.id} className="flex flex-wrap gap-x-2">
                  <span className="text-muted-foreground">{formatDateTime(w.received_at)}</span>
                  <span className="font-mono text-xs">{w.result ?? "-"}</span>
                  <span className={cn(w.match_result !== "APPLIED" && w.match_result !== "NOOP" && "text-bds-status-warning-text")}>
                    {w.match_result ?? "-"}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{w.distinct_key ?? ""}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ReasonDialog
        open={build !== null}
        title={build?.ignoreHold ? "보류 기간 무시하고 회차 만들기(TEST)" : "회차 만들기"}
        description="모임장별로 승인 대기 회차를 만듭니다. 이 단계에서는 돈이 움직이지 않습니다."
        warning={
          build?.ignoreHold ? (
            <WarningBox tone="caution">
              아직 경기가 끝나지 않은 결제까지 넣습니다(dev 시험용). 회차에 &lsquo;보류 무시&rsquo; 표시가 남습니다.
            </WarningBox>
          ) : undefined
        }
        confirmLabel="만들기"
        onClose={() => setBuild(null)}
        onSubmit={async (reason) => {
          if (!build) return false;
          const r = await buildSettlementsAction({ ignoreHold: build.ignoreHold, reason });
          if (!r.ok) {
            toast.error(r.error.message);
            return false;
          }
          toast.success(
            `승인 대기 ${r.data.created}건 · 이월 ${r.data.carried}건` +
              (r.data.skipped > 0 ? ` · 건너뜀 ${r.data.skipped}건(승인 대기 회차가 이미 있음)` : "")
          );
          void queryClient.invalidateQueries({ queryKey: ["payout-overview"] });
          return true;
        }}
      />
      <SettlementDetailDialog settlementId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

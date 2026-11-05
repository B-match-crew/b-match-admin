"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/src/shared/ui/kit/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/src/shared/ui/kit/dialog";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/shared/ui/kit/table";
import { InfoField, InfoGrid } from "@/src/shared/ui/info-field";
import { QueryError } from "@/src/shared/ui/query-error";
import { ReasonDialog } from "@/src/shared/ui/reason-dialog";
import { WarningBox } from "@/src/shared/ui/warning-box";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { unwrap } from "@/src/shared/lib/unwrap";
import { useAuth } from "@/src/app/providers/auth-provider";
import { approveSettlementAction, cancelSettlementAction, fetchSettlementDetail, payoutAction } from "../api/actions";
import {
  canHold,
  canRelease,
  canRetry,
  detailSummary,
  HOLD_REASON_LABELS,
  policyRows,
  releaseWarning,
  won,
} from "../model/status";
import type { HoldReason, Payout } from "../model/types";
import { PayoutStatusBadge, ProvisionalBadge, SettlementStatusBadge } from "./payout-badge";

type Pending =
  | { kind: "approve" }
  | { kind: "cancel" }
  | { kind: "hold" | "release" | "retry"; payout: Payout };

const TITLES = {
  approve: "회차 승인",
  cancel: "회차 취소",
  hold: "지급 보류",
  release: "보류 해제",
  retry: "지급 재시도(새 지급)",
} as const;

/** 회차 상세 — 금액 근거(항목) · 지급 · 이력 · 계좌(마스킹) · 조치(SUPER_ADMIN). */
export function SettlementDetailDialog({ settlementId, onClose }: { settlementId: number | null; onClose: () => void }) {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<Pending | null>(null);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["settlement-detail", settlementId],
    queryFn: () => unwrap(fetchSettlementDetail(settlementId!)),
    enabled: settlementId != null,
    refetchInterval: 60_000,   // 1분 — 조치 뒤에는 바로 다시 읽는다(refresh)
  });
  const isSuper = role === "SUPER_ADMIN";
  const s = data?.settlement;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["settlement-detail", settlementId] });
    void queryClient.invalidateQueries({ queryKey: ["payout-overview"] });
  };

  return (
    <Dialog open={settlementId != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>회차 #{settlementId}</DialogTitle>
          <DialogDescription>금액은 만든 시점의 스냅샷입니다. 그 뒤의 환불은 다음 회차에서 뺍니다.</DialogDescription>
        </DialogHeader>
        {isError && <QueryError section="회차 상세" error={error} onRetry={() => void refetch()} />}
        {(isLoading || !data || !s) && !isError ? (
          <Skeleton className="h-64" />
        ) : data && s ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <SettlementStatusBadge status={s.status} />
              <span>
                {s.host_snapshot?.nickname ?? "-"} <span className="text-muted-foreground">#{s.host_user_id ?? "-"}</span>
              </span>
              {s.ignored_hold && <span className="text-bds-caption1 text-bds-status-warning-text">보류 기간 무시(TEST)</span>}
            </div>
            <InfoGrid columns={3}>
              <InfoField label="결제 합계">{won(s.gross_amount)}</InfoField>
              <InfoField label="지난 회차 뒤 환불">{won(s.refund_deduction)}</InfoField>
              <InfoField label="이월">{won(s.carry_in)}</InfoField>
              <InfoField label="수수료">
                {won(s.fee_amount)} <span className="text-muted-foreground">({s.fee_bp / 100}%)</span>
              </InfoField>
              <InfoField label="원천징수">{won(s.withholding_amount)}</InfoField>
              <InfoField label="지급액">
                <b>{won(s.net_amount)}</b>
              </InfoField>
            </InfoGrid>
            {s.policy_snapshot?.provisional && (
              <div className="flex flex-wrap items-center gap-1.5 text-bds-caption1 text-muted-foreground">
                만든 시점 정책:
                {policyRows(s.policy_snapshot).map((r) => (
                  <span key={r.label} className="inline-flex items-center gap-1">
                    {r.label} {r.value}
                    {r.decision && <ProvisionalBadge decision={r.decision} />}
                  </span>
                ))}
              </div>
            )}
            <InfoGrid columns={3}>
              <InfoField label="정산 계좌">
                {data.account ? `${data.account.bank_name ?? ""} ${data.account.account_masked}` : "없음"}
              </InfoField>
              <InfoField label="예금주">
                {data.account
                  ? `${data.account.holder_name} · ${data.account.name_check === "MATCHED" ? "실명 일치" : "TEST — 대조 생략"}`
                  : "-"}
              </InfoField>
              <InfoField label="기준 시각">{formatDateTime(s.cutoff_at)}</InfoField>
            </InfoGrid>

            {isSuper && s.status === "DRAFT" && (
              <div className="flex gap-2">
                <Button onClick={() => setPending({ kind: "approve" })}>승인(지급 만들기)</Button>
                <Button variant="outline" onClick={() => setPending({ kind: "cancel" })}>
                  취소
                </Button>
              </div>
            )}

            <section className="space-y-2">
              <h3 className="text-bds-headline2">지급</h3>
              {data.payouts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {s.status === "CARRIED" ? "0원 이하라 이체하지 않았습니다 — 다음 회차로 넘깁니다." : "아직 없습니다."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">이체 금액</TableHead>
                      <TableHead>코드 · 메시지</TableHead>
                      <TableHead>시도</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.payouts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="tabular-nums">
                          {p.id}
                          {p.retry_of_id && <span className="ml-1 text-muted-foreground">← {p.retry_of_id}</span>}
                        </TableCell>
                        <TableCell>
                          <PayoutStatusBadge status={p.status} />
                          {p.hold_reason && (
                            <div
                              className={
                                p.hold_reason === "UNCERTAIN"
                                  ? "text-bds-caption2 font-medium text-bds-status-error-text"
                                  : "text-bds-caption2 text-muted-foreground"
                              }
                            >
                              {HOLD_REASON_LABELS[p.hold_reason as HoldReason] ?? p.hold_reason}
                            </div>
                          )}
                          {p.request_inflight_at && p.hold_reason !== "UNCERTAIN" && (
                            <div className="text-bds-caption2 text-muted-foreground">
                              요청 보냄 {formatDateTime(p.request_inflight_at)} · 답 기다리는 중
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{won(p.tran_amount)}</TableCell>
                        <TableCell className="text-xs">
                          <span className="font-mono">{p.pg_code ?? "-"}</span> {p.pg_message ?? ""}
                          <div className="font-mono text-muted-foreground">{p.distinct_key}</div>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {p.attempts}
                          {p.next_try_at && !p.paid_at && (
                            <div className="text-bds-caption2 text-muted-foreground">
                              다음 {formatDateTime(p.next_try_at)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="space-x-1 text-right">
                          {isSuper && canHold(p) && p.status !== "HELD" && (
                            <Button size="sm" variant="outline" onClick={() => setPending({ kind: "hold", payout: p })}>
                              보류
                            </Button>
                          )}
                          {isSuper && canRelease(p) && (
                            <Button size="sm" variant="outline" onClick={() => setPending({ kind: "release", payout: p })}>
                              해제
                            </Button>
                          )}
                          {isSuper && canRetry(p, data.payouts) && (
                            <Button size="sm" variant="outline" onClick={() => setPending({ kind: "retry", payout: p })}>
                              재시도
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-bds-headline2">근거 ({data.items.length})</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>구분</TableHead>
                    <TableHead>주문번호</TableHead>
                    <TableHead>모집글</TableHead>
                    <TableHead>결제 상태(지금)</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((i) => (
                    <TableRow key={`${i.kind}-${i.order_no}`}>
                      <TableCell>{i.kind === "PAYMENT" ? "결제" : "환불 차감"}</TableCell>
                      <TableCell className="font-mono text-xs">{i.order_no}</TableCell>
                      <TableCell className="tabular-nums">{i.target_id}</TableCell>
                      <TableCell>{i.payment_status}</TableCell>
                      <TableCell className="text-right tabular-nums">{won(i.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>

            <section className="space-y-2">
              <h3 className="text-bds-headline2">이력</h3>
              <ul className="space-y-1 text-sm">
                {data.events.map((e, idx) => (
                  <li key={idx} className="flex flex-wrap gap-x-2">
                    <span className="text-muted-foreground">{formatDateTime(e.created_at)}</span>
                    <span>{e.payout_id ? `지급 #${e.payout_id}` : "회차"}</span>
                    <span>
                      {e.from ?? "∅"} → {e.to ?? "∅"}
                    </span>
                    <span className="text-muted-foreground">{e.actor}</span>
                    {e.pg_code && <span className="font-mono text-xs">{e.pg_code}</span>}
                    {e.pg_message && <span className="text-xs text-muted-foreground">{e.pg_message}</span>}
                    {detailSummary(e.detail) && (
                      <span className="font-mono text-xs text-muted-foreground">{detailSummary(e.detail)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}

        <ReasonDialog
          open={pending !== null}
          title={pending ? TITLES[pending.kind] : ""}
          warning={
            pending?.kind === "approve" ? (
              <WarningBox tone="caution">
                승인하면 지급이 만들어지고 <b>지급 시간(07~22시)이면 1분 안에 실제 이체</b>가 시작됩니다. 밤에는 07시에
                시작합니다(TEST 는 1,000원 고정).
              </WarningBox>
            ) : pending?.kind === "retry" ? (
              <WarningBox tone="caution">같은 금액으로 새 지급을 만듭니다. 앞 건은 그대로 남습니다.</WarningBox>
            ) : pending?.kind === "release" && releaseWarning(pending.payout) === "uncertain" ? (
              <WarningBox tone="danger">
                <b>이 지급은 이체 대기 요청의 답을 받지 못했습니다.</b> 해제하면 지급 시간(07~22시)의 1분 안에 <b>같은 키</b>
                (<span className="font-mono">{pending.payout.distinct_key}</span>)로 다시 요청하고 바로 실행합니다.
                페이플에 앞 요청의 대기가 남아 있으면 <b>같이 실행돼 두 번 나갑니다.</b>
                <br />
                먼저 페이플 파트너 관리자 › 정산지급대행에서 이 키의 대기 · 이체 내역을 확인하세요. 대기가 있으면
                거기서 취소한 뒤 해제하고, 이미 이체됐으면 해제하지 말고 웹훅 · 결과 확인을 기다리세요.
              </WarningBox>
            ) : pending?.kind === "release" ? (
              <WarningBox tone="caution">
                해제하면 다시 지급 대기가 되고 <b>지급 시간(07~22시)이면 1분 안에 실제 이체</b>가 시작됩니다(TEST 는
                1,000원 고정).
                보류 사유(계좌 · 정지 등)가 남아 있으면 다시 보류됩니다.
              </WarningBox>
            ) : undefined
          }
          confirmLabel={pending ? TITLES[pending.kind] : "확인"}
          destructive={
            pending?.kind === "cancel" ||
            pending?.kind === "hold" ||
            (pending?.kind === "release" && releaseWarning(pending.payout) === "uncertain")
          }
          onClose={() => setPending(null)}
          onSubmit={async (reason) => {
            if (!pending || settlementId == null) return false;
            const r =
              pending.kind === "approve"
                ? await approveSettlementAction({ id: settlementId, reason })
                : pending.kind === "cancel"
                  ? await cancelSettlementAction({ id: settlementId, reason })
                  : await payoutAction({ action: pending.kind, id: pending.payout.id, reason });
            if (!r.ok) {
              toast.error(r.error.message);
              return false;
            }
            toast.success(`${TITLES[pending.kind]} 완료`);
            refresh();
            return true;
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

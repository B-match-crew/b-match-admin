"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/src/shared/ui/kit/button";
import { Input } from "@/src/shared/ui/kit/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/shared/ui/kit/select";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/shared/ui/kit/table";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { unwrap } from "@/src/shared/lib/unwrap";
import { fetchPayments } from "../api/actions";
import { PAYMENT_STATUS_META, won } from "../model/status";
import { PAYMENT_STATUSES, type PaymentStatus } from "../model/types";
import { PaymentStatusBadge } from "./payment-status-badge";
import { isPaymentsMissing, PaymentsUnavailable } from "./payments-unavailable";

const PAGE_SIZE = 50;

/** 결제 목록 — 기간 · 상태 · 환경 · 검색(주문번호 · 페이플 주문번호 · 승인번호 · 거래키 · 회원/모집글 id · 닉네임 · 제목). */
export function PaymentsList({ onOpenOrder }: { onOpenOrder: (orderNo: string) => void }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<PaymentStatus | "ALL">("ALL");
  const [env, setEnv] = useState<"ALL" | "TEST" | "LIVE">("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["payments", status, env, dateFrom, dateTo, query, page],
    queryFn: () =>
      unwrap(
        fetchPayments({
          statuses: status === "ALL" ? undefined : [status],
          env: env === "ALL" ? undefined : env,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          query,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        })
      ),
  });

  if (isError && isPaymentsMissing(error)) return <PaymentsUnavailable />;

  const rows = data?.rows;
  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);
  const reset = () => setPage(0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as PaymentStatus | "ALL");
            reset();
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체 상태</SelectItem>
            {PAYMENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {PAYMENT_STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={env}
          onValueChange={(v) => {
            setEnv(v as "ALL" | "TEST" | "LIVE");
            reset();
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체 환경</SelectItem>
            <SelectItem value="TEST">TEST</SelectItem>
            <SelectItem value="LIVE">LIVE</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <Input type="date" className="w-36" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); reset(); }} />
          <span className="text-muted-foreground">~</span>
          <Input type="date" className="w-36" value={dateTo} onChange={(e) => { setDateTo(e.target.value); reset(); }} />
        </div>
        <form
          className="flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(draft);
            reset();
          }}
        >
          <Input
            className="w-72"
            placeholder="주문번호 · 승인번호 · 회원/모집글 ID · 닉네임"
            value={draft}
            maxLength={100}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button type="submit" variant="outline" size="sm">
            검색
          </Button>
        </form>
        <Button variant="outline" size="sm" onClick={() => void queryClient.invalidateQueries({ queryKey: ["payments"] })}>
          새로고침
        </Button>
      </div>

      {isError && <QueryError section="결제 목록" error={error} />}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>주문번호</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">금액</TableHead>
              <TableHead>결제자</TableHead>
              <TableHead>모집글</TableHead>
              <TableHead>카드 · 승인번호</TableHead>
              <TableHead>시도</TableHead>
              <TableHead>생성</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && (rows?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState message="결제가 없습니다." />
                </TableCell>
              </TableRow>
            )}
            {rows?.map((p) => (
              <TableRow key={p.order_no} className="cursor-pointer" onClick={() => onOpenOrder(p.order_no)}>
                <TableCell className="font-mono text-xs">
                  {p.order_no}
                  {p.pg_env === "TEST" && <span className="ml-1 text-muted-foreground">TEST</span>}
                </TableCell>
                <TableCell>
                  <PaymentStatusBadge status={p.status} />
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {won(p.amount)}
                  {p.refunded_amount > 0 && (
                    <div className="text-xs text-muted-foreground">환불 {won(p.refunded_amount)}</div>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {p.nickname ?? "-"} <span className="text-xs text-muted-foreground">#{p.user_id ?? "파기"}</span>
                </TableCell>
                <TableCell className="text-sm">
                  {p.target_title ?? "-"} <span className="text-xs text-muted-foreground">#{p.target_id}</span>
                </TableCell>
                <TableCell className="text-xs">
                  {p.card_name ?? "-"} · {p.pg_auth_no ?? "-"}
                </TableCell>
                <TableCell className="text-xs tabular-nums">{p.attempt_count}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDateTime(p.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            이전
          </Button>
          <span className="text-sm text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            다음
          </Button>
        </div>
      )}
    </div>
  );
}

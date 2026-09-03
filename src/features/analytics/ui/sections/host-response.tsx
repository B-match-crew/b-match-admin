"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Button } from "@/src/shared/ui/kit/button";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { unwrap } from "@/src/shared/lib/unwrap";
import { formatMinutes } from "@/src/shared/lib/format-number";
import { fetchHostResponseRanking } from "../../api/actions";
import type { HostResponseOrder } from "../../model/actions";

const PAGE_SIZE = 50;

/**
 * 열 머리를 눌러 정렬 축을 바꾼다. 값은 **서버(104)의 화이트리스트와 같아야
 * 한다** — 오타는 조용히 무시되지 않고 예외로 돌아온다.
 */
const SORTS: {
  key: string;
  label: string;
  orders: HostResponseOrder[];
  hint: string;
}[] = [
  { key: "rooms", label: "받은 문의", orders: ["rooms_desc"], hint: "많이 받는 순" },
  {
    key: "rate",
    label: "응답률",
    orders: ["rate_asc", "rate_desc"],
    hint: "안 하는 순 / 잘 하는 순",
  },
  {
    key: "unanswered",
    label: "미응답",
    orders: ["unanswered_desc"],
    hint: "쌓인 순",
  },
  {
    key: "median",
    label: "첫 응답",
    orders: ["median_asc", "median_desc"],
    hint: "빠른 순 / 늦은 순",
  },
];

/**
 * 모임장별 문의 응답 — 누가 빨리·자주 답하고, 누가 늦게·아예 안 답하는가.
 *
 * 통계 화면의 "문의 응답"(90)은 전체 합계 하나라 운영이 할 수 있는 일이 없다.
 * 바로 위 [모임별 연락 전환율](103)과 나란히 읽으면 "연락은 오는데 안 받는
 * 모임장" 이 그 교집합에서 드러난다.
 *
 * 상위 N 이 아니라 **전수 목록**이다 — 문의 1건 받고 안 답한 모임장을 하한으로
 * 걸러내면, 정작 봐야 할 쪽이 목록에서 사라진다.
 */
export function HostResponseSection({ days }: { days: number }) {
  const [order, setOrder] = useState<HostResponseOrder>("rate_asc");
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["analytics-host-response", days, order, page],
    queryFn: () =>
      unwrap(
        fetchHostResponseRanking({
          days,
          order,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        }),
      ),
    // 페이지를 넘길 때 표가 통째로 비었다가 다시 그려지면 어디를 보고 있었는지
    // 잃는다. 이전 페이지를 깔아 두고 그 위에 새 페이지를 얹는다.
    placeholderData: keepPreviousData,
  });

  const rows = data?.rows ?? [];
  const meta = data?.meta;
  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  const sortBy = (next: HostResponseOrder) => {
    setOrder(next);
    setPage(0); // 정렬이 바뀌면 지금 페이지 번호는 의미가 없다
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">모임장별 문의 응답</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">
          기간 내 <b>받은 문의</b> 중 모임장 본인이 답한 비율. 위 표(모임별 연락
          전환율)와 함께 보면 <b>연락은 오는데 답하지 않는 모임장</b>이 드러납니다.
          하한 없이 전부 표시하므로 문의 수 열을 함께 보세요.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : isError ? (
          <QueryError error={error} onRetry={() => void refetch()} />
        ) : !rows.length ? (
          <EmptyState message="이 기간에 들어온 문의가 없습니다." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-bds-caption1">
                <thead>
                  <tr className="text-bds-label-alternative">
                    <th className="py-2 text-left font-medium">모임장</th>
                    {SORTS.map((s) => {
                      const active = s.orders.includes(order);
                      // 같은 열을 다시 누르면 방향을 뒤집는다. 축이 하나뿐인
                      // 열(받은 문의·미응답)은 누를 때마다 같은 순서다.
                      const next =
                        active && s.orders.length > 1
                          ? s.orders[(s.orders.indexOf(order) + 1) % s.orders.length]
                          : s.orders[0];
                      return (
                        <th key={s.key} className="py-2 text-right font-medium">
                          <button
                            type="button"
                            onClick={() => sortBy(next)}
                            title={s.hint}
                            className={
                              active
                                ? "text-bds-label-normal underline underline-offset-4"
                                : "hover:text-bds-label-normal"
                            }
                          >
                            {s.label}
                            {active && (order.endsWith("_asc") ? " ↑" : " ↓")}
                          </button>
                        </th>
                      );
                    })}
                    <th className="py-2 text-right font-medium">p90</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((h) => (
                    <tr
                      key={h.hostUserId}
                      className="border-t border-bds-gray-100"
                    >
                      <td className="py-2 text-bds-label-normal">
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          {h.clubName ?? h.nickname ?? `#${h.hostUserId}`}
                          {h.clubName && h.nickname && (
                            <span className="text-bds-caption2 text-bds-label-alternative">
                              {h.nickname}
                              {h.level && ` · ${h.level}`}
                            </span>
                          )}
                          {/* 모임이 없는데 문의 이력이 남은 경우 — 모임을 지웠거나
                              탈퇴했다. 응답률이 낮아도 조치할 대상이 아니다. */}
                          {!h.clubName && (
                            <span className="text-bds-caption2 text-bds-label-assistive">
                              모임 없음
                            </span>
                          )}
                          {h.userStatus !== "ACTIVE" && (
                            <StatusBadge status={h.userStatus} />
                          )}
                        </span>
                      </td>
                      <td className="py-2 text-right">{h.rooms.toLocaleString()}</td>
                      <td className="py-2 text-right">
                        {h.responseRate == null ? "-" : `${h.responseRate}%`}
                        <span className="ml-1 text-bds-caption2 text-bds-label-alternative">
                          ({h.answered}/{h.rooms})
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        {h.unanswered.toLocaleString()}
                        {h.unansweredRecent > 0 && (
                          <span
                            className="ml-1 text-bds-caption2 text-bds-label-alternative"
                            title="열린 지 24시간이 지나지 않아 아직 미응답으로 단정할 수 없는 문의"
                          >
                            (유보 {h.unansweredRecent})
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        {h.medianMinutes == null
                          ? "-"
                          : formatMinutes(h.medianMinutes)}
                      </td>
                      <td className="py-2 text-right text-bds-label-alternative">
                        {h.p90Minutes == null ? "-" : formatMinutes(h.p90Minutes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  이전
                </Button>
                <span className="text-bds-body3 text-muted-foreground">
                  {page + 1} / {totalPages}
                  <span className="ml-2 text-bds-caption2">
                    (모임장 {data?.total.toLocaleString()}명)
                  </span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  다음
                </Button>
              </div>
            )}

            <p className="text-bds-caption2 text-bds-label-alternative">
              응답은 <b>모임장 본인이 그 방에 보낸 첫 메시지</b>로 판정합니다.
              일정 안내(시스템 메시지)와 문의자 본인의 추가 메시지는 응답이
              아닙니다. 첫 응답 시간은 방이 열린 시각부터 잽니다.
              {(meta?.excludedNoHost ?? 0) + (meta?.excludedHostInitiated ?? 0) >
                0 && (
                <>
                  {" "}이 기간에{" "}
                  {meta!.excludedHostInitiated > 0 && (
                    <>
                      모임장이 먼저 말을 건 방 {meta!.excludedHostInitiated}개
                      {meta!.excludedNoHost > 0 && ", "}
                    </>
                  )}
                  {meta!.excludedNoHost > 0 && (
                    <>어느 모임장 것인지 알 수 없는 방 {meta!.excludedNoHost}개</>
                  )}
                  는 집계에서 제외했습니다.
                </>
              )}
            </p>

            {meta?.windowCapped && (
              <p className="text-bds-caption2 text-bds-status-warning-text">
                선택한 기간이 남아 있는 대화보다 깁니다. 보관 기간이 지난 대화는
                파기되어 답장 여부를 알 수 없으므로 <b>{meta.windowFrom}</b> 이후
                열린 방만으로 계산했습니다 — 그 이전까지 포함해 특정 모임장을
                평가하지 마세요.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

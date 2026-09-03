"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { fetchChatStats } from "../../api/actions";
import type { ChatStats } from "../../model/actions";
import { SERIES_1, SERIES_2 } from "../chart-tokens";
import { formatMinutes } from "@/src/shared/lib/format-number";
import { ChatTile } from "../primitives";

/**
 * 채팅은 제품의 큰 축이 됐는데(61~87) 어드민에는 신고 화면만 있었다.
 * 여기서는 **운영이 봐야 하는 최소치**만 본다 — 대화 내용은 신고가 있을 때만
 * 신고 화면의 스냅샷으로 본다(30일 파기 고지와 어긋나지 않기 위해).
 */
export function ChatSection({ days }: { days: number }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["stats-chat", days],
    queryFn: () => unwrap(fetchChatStats(days)),
  });

  if (isError) {
    return (
      <QueryError section="채팅" error={error} onRetry={() => void refetch()} />
    );
  }

  // 채팅 미적용 DB(=prod)에서는 섹션 자체를 접는다. 0 으로 채운 카드를 보여주면
  // "채팅을 아무도 안 쓴다" 로 읽힌다.
  if (!isLoading && data && !data.available) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>채팅</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            message="이 환경에는 채팅 스키마가 없습니다"
            description="채팅 마이그레이션이 적용되면 방·메시지 지표가 여기에 표시됩니다."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>채팅</CardTitle>
        <CardDescription>
          방은 전체 기준, 메시지 추이는 선택 기간 기준입니다. 보관 기간이 지난
          대화의 파기 현황은 <b>시스템 &gt; 동의·파기</b>에서 봅니다 — 보관 규칙은
          바뀌므로 정의를 한 곳에만 둡니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading || !data ? (
          <Skeleton className="h-64" />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ChatTile label="전체 방" value={data.roomsTotal} />
              <ChatTile label="열린 방" value={data.roomsActive} />
              <ChatTile
                label="빈 방"
                value={data.roomsEmpty}
                hint="한 마디도 오가지 않음"
              />
              <ChatTile
                label="미처리 신고"
                value={data.reportsPending}
                hint={`전체 ${data.reportsTotal}건`}
                warn={data.reportsPending > 0}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ChatTile
                label="신규 문의"
                value={data.roomsCreated}
                hint="기간 내 새로 열린 방"
              />
              <ChatTile label="기간 내 메시지" value={data.messagesRanged} />
              <ChatTile label="기간 내 대화한 사람" value={data.sendersRanged} />
              <ChatTile
                label="기간 내 활성 방"
                value={data.roomsRanged}
                hint="예전 방의 대화 포함"
              />
            </div>

            <ChatResponseBlock response={data.response} />


            {data.daily.length === 0 ? (
              <EmptyState message="기간 내 주고받은 메시지가 없습니다." />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.daily}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="messages"
                    name="메시지"
                    stroke={SERIES_1}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="senders"
                    name="대화한 사람"
                    stroke={SERIES_2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 응답 지표 — 문의가 **답을 받는가**.
 *
 * 방은 유저가 첫 메시지를 보내는 순간 생기므로(app migration 82) 위쪽 지표는
 * 모임장 답장과 무관하다. 문의가 얼마나 들어오는지는 보여도 답 없는 문의가
 * 쌓이는 것은 보이지 않아서, 이 블록이 그 답을 맡는다.
 */
export function ChatResponseBlock({
  response,
}: {
  response: ChatStats["response"];
}) {
  // 90 미적용 DB. 0% 로 그리면 "아무도 답을 안 한다" 로 읽히므로 감춘다.
  if (!response) return null;

  const rate =
    response.rooms > 0
      ? Math.round((response.answered / response.rooms) * 1000) / 10
      : null;
  const unanswered = response.rooms - response.answered;

  return (
    <div className="space-y-2 rounded-lg border border-bds-border-alternative bg-bds-back-alternative p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-bds-heading3">문의 응답</h4>
        <span className="text-bds-caption2 text-bds-label-alternative">
          {response.from} 이후 열린 방 {response.rooms.toLocaleString()}개 기준
        </span>
      </div>

      {/* 여기는 합계까지만 답한다. "누가" 는 축이 사람이라 분석 화면에 있다(104). */}
      <Link
        href="/analytics"
        className="text-bds-caption2 text-bds-primary-900 underline underline-offset-2"
      >
        모임장별 응답률 보기 →
      </Link>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ChatTile
          label="응답률"
          value={rate ?? 0}
          suffix="%"
          hint={`${response.answered.toLocaleString()} / ${response.rooms.toLocaleString()}개 방`}
          warn={rate !== null && rate < 50}
        />
        <ChatTile
          label="첫 응답까지 (중앙값)"
          value={response.medianMinutes ?? 0}
          formatted={
            response.medianMinutes === null
              ? "-"
              : formatMinutes(response.medianMinutes)
          }
        />
        <ChatTile
          label="답 없는 문의"
          value={unanswered}
          warn={unanswered > 0}
        />
        <ChatTile
          label="아직 24시간 이내"
          value={response.unansweredRecent}
          hint="답할 시간이 남음"
        />
      </div>

      {response.unansweredRecent > 0 && (
        <p className="text-bds-caption2 text-bds-label-alternative">
          답 없는 문의 {unanswered.toLocaleString()}개 중{" "}
          {response.unansweredRecent.toLocaleString()}개는 열린 지 24시간이 지나지
          않았습니다 — 아직 미응답으로 단정할 수 없습니다.
        </p>
      )}

      {response.windowCapped && (
        <p className="text-bds-caption2 text-bds-status-warning-text">
          선택한 기간이 남아 있는 대화보다 깁니다. 보관 기간이 지난 대화는
          파기되어 답장 여부를 알 수 없으므로, 응답률은 <b>{response.from}</b>{" "}
          이후에 열린 방만으로 계산했습니다.
        </p>
      )}
    </div>
  );
}

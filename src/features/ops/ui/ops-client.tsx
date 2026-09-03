"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock, Radio, Send } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/shared/ui/kit/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/shared/ui/kit/table";
import { Alert, AlertDescription } from "@/src/shared/ui/kit/alert";
import { Badge } from "@/src/shared/ui/kit/badge";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { SegmentedTab } from "@/src/shared/ui/bds/segmented-tab";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { WarningBox } from "@/src/shared/ui/warning-box";
import { unwrap } from "@/src/shared/lib/unwrap";
import { formatNumber } from "@/src/shared/lib/format-number";
import { formatKst, formatRelativeTime } from "@/src/shared/lib/format-date";
import {
  fetchCronHealth,
  fetchEventNames,
  fetchPushBacklog,
} from "../api/actions";
import { TRACKED_EVENTS } from "../model/constants";

const RANGES = [
  { value: "7", label: "7일" },
  { value: "30", label: "30일" },
  { value: "90", label: "90일" },
] as const;

export function OpsClient() {
  const [days, setDays] = useState<"7" | "30" | "90">("30");

  return (
    <div className="space-y-6">
      <PushBacklogSection />
      <CronSection />
      <EventSection days={Number(days)} range={days} onRangeChange={setDays} />
    </div>
  );
}

// ─── 푸시 적체 ───

/**
 * 맨 위에 두는 이유: 이 화면에서 **가장 빨리 썩는 것**이 발송이고, 크론 표는
 * "잡이 돌았는가" 만 답한다. 잡이 성공으로 찍혀도 Edge Function 이 거절하면
 * 알림은 안 나간다 — 그 경우는 여기서만 보인다.
 */
function PushBacklogSection() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["push-backlog"],
    queryFn: () => unwrap(fetchPushBacklog()),
  });

  if (isError) {
    return (
      <QueryError
        section="푸시 발송 적체"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  const stale = data?.pendingStale ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="size-4" />
          푸시 발송 적체
        </CardTitle>
        <CardDescription>
          발송기는 5분마다 돕니다. 정상이면 PENDING 은 곧 사라집니다.{" "}
          <b>15분 넘게 남아 있으면</b> 크론·Vault 시크릿·Edge Function 중
          하나가 멈춘 것입니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Skeleton className="h-24" />}

        {!isLoading && data && (
          <>
            {stale > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="size-4" />
                <AlertDescription>
                  <b>{formatNumber(stale)}건</b>이 15분 넘게 발송되지 않았습니다.
                  아래 크론 표에서 <code>cron_dispatch_push</code> 를 먼저 보고,
                  성공으로 찍혀 있다면 Edge Function 로그를 확인하세요.
                </AlertDescription>
              </Alert>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <Tile label="대기 중" value={data.pendingTotal} />
              <Tile
                label="15분 초과"
                value={stale}
                tone={stale > 0 ? "danger" : undefined}
                hint={stale > 0 ? "발송이 멈춘 상태입니다" : "정상"}
              />
              <div className="rounded-lg border p-3">
                <div className="text-bds-caption2 text-bds-label-assistive">
                  가장 오래된 대기
                </div>
                <div className="mt-0.5 text-bds-title3 text-foreground">
                  {data.oldestPending ? formatRelativeTime(data.oldestPending) : "-"}
                </div>
                {data.oldestPending && (
                  <div className="text-bds-caption2 text-bds-label-alternative">
                    {formatKst(data.oldestPending)}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── 크론 ───

/** 잡 이름 → 무엇이 멈추는가. 이름만으로는 영향 범위를 알 수 없다. */
const JOB_IMPACT: Record<string, string> = {
  cron_dispatch_push: "푸시 발송 (멈추면 알림이 나가지 않음)",
  cron_match_lifecycle: "모임 종료 전환 · 탈퇴 CI 정리",
  cron_purge_incomplete_signups: "인증 미완료 계정 정리",
  cron_app_events_partitions: "이벤트 파티션 생성 (멈추면 월초에 적재가 전부 실패)",
  cron_host_remind: "모임장 재등록 리마인드",
  cron_purge_deleted_accounts: "탈퇴 계정 파기 (멈추면 개인정보가 남음)",
  cron_marketing_reconfirm: "광고성 2년 재확인 (멈추면 법 위반)",
  cron_purge_chat_messages: "채팅 30일 파기",
};

function CronSection() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["cron-health"],
    queryFn: () => unwrap(fetchCronHealth()),
  });

  if (isError) {
    return <QueryError section="크론 상태" error={error} onRetry={() => void refetch()} />;
  }

  const failed = (data ?? []).filter((j) => j.lastStatus === "failed");
  const neverRan = (data ?? []).filter((j) => j.active && j.lastStart === null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="size-4" />
          크론 상태
        </CardTitle>
        <CardDescription>
          잡별 <b>가장 최근 1회</b> 실행 결과입니다. 크론은 실패해도 아무 데도
          알리지 않으므로, 여기가 유일한 확인 경로입니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Skeleton className="h-48" />}

        {!isLoading && (data?.length ?? 0) === 0 && (
          <EmptyState
            message="크론 정보를 읽을 수 없습니다"
            description="pg_cron 이 설치되지 않았거나 이 환경에 잡이 없습니다."
          />
        )}

        {failed.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription>
              마지막 실행이 실패한 잡이 {failed.length}개 있습니다:{" "}
              <b>{failed.map((j) => j.jobname).join(", ")}</b>
            </AlertDescription>
          </Alert>
        )}
        {neverRan.length > 0 && (
          <WarningBox tone="caution">
            켜져 있지만 한 번도 실행된 기록이 없는 잡:{" "}
            <b>{neverRan.map((j) => j.jobname).join(", ")}</b>. 스케줄이 아직
            도래하지 않았거나, 등록만 되고 돌지 않는 상태입니다.
          </WarningBox>
        )}

        {!isLoading && (data?.length ?? 0) > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>잡</TableHead>
                <TableHead>스케줄</TableHead>
                <TableHead>마지막 실행</TableHead>
                <TableHead>결과</TableHead>
                <TableHead>메시지</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((j) => (
                <TableRow key={j.jobname} className={j.active ? undefined : "opacity-60"}>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs">{j.jobname}</span>
                      {!j.active && (
                        <Badge className="bg-bds-back-strong text-bds-label-neutral">
                          꺼짐
                        </Badge>
                      )}
                    </div>
                    {JOB_IMPACT[j.jobname] && (
                      <div className="text-bds-caption2 text-bds-label-alternative">
                        {JOB_IMPACT[j.jobname]}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {j.schedule}
                  </TableCell>
                  <TableCell className="text-sm">
                    {j.lastStart ? (
                      <>
                        <div>{formatKst(j.lastStart)}</div>
                        <div className="text-bds-caption2 text-bds-label-alternative">
                          {formatRelativeTime(j.lastStart)}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">기록 없음</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <CronStatusBadge status={j.lastStatus} />
                  </TableCell>
                  <TableCell className="max-w-sm break-words font-mono text-xs text-bds-status-error-text">
                    {j.lastMessage ?? ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function CronStatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <Badge className="bg-bds-back-strong text-bds-label-neutral">-</Badge>
    );
  }
  if (status === "succeeded") {
    return (
      <Badge className="bg-bds-primary-100 text-bds-primary-900">성공</Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge className="bg-bds-status-error-subtle text-bds-status-error-text">
        실패
      </Badge>
    );
  }
  return (
    <Badge className="bg-bds-status-info-subtle text-bds-status-info-text">
      {status}
    </Badge>
  );
}

// ─── 이벤트 이름 ───

function EventSection({
  days,
  range,
  onRangeChange,
}: {
  days: number;
  range: "7" | "30" | "90";
  onRangeChange: (v: "7" | "30" | "90") => void;
}) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["event-names", days],
    queryFn: () => unwrap(fetchEventNames(days)),
  });

  if (isError) {
    return (
      <QueryError section="수집 이벤트" error={error} onRetry={() => void refetch()} />
    );
  }

  const seen = new Set((data ?? []).map((e) => e.eventName));
  const missing = TRACKED_EVENTS.filter((e) => !seen.has(e));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Radio className="size-4" />
              수집 이벤트
            </CardTitle>
            <CardDescription>
              분석 페이지의 퍼널 집계는 <b>이벤트 이름을 문자열로</b> 찾습니다.
              앱이 이름을 바꾸면 오류 없이 그 단계가 0 이 됩니다.
            </CardDescription>
          </div>
          <div className="w-48">
            <SegmentedTab
              items={RANGES}
              value={range}
              onValueChange={onRangeChange}
              size="sm"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Skeleton className="h-48" />}

        {!isLoading && missing.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription>
              분석 집계가 찾는 이름 중 기간 내에 <b>한 건도 들어오지 않은</b>{" "}
              것이 있습니다: <b>{missing.join(", ")}</b>. 앱이 이름을 바꿨다면
              해당 퍼널 단계는 지금 0 으로 계산되고 있습니다.
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && (data?.length ?? 0) === 0 ? (
          <EmptyState message="기간 내 수집된 이벤트가 없습니다." />
        ) : (
          !isLoading && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이벤트</TableHead>
                  <TableHead className="text-right">건수</TableHead>
                  <TableHead className="text-right">회원</TableHead>
                  <TableHead className="text-right">기기</TableHead>
                  <TableHead>마지막 수집</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.map((e) => {
                  const tracked = (TRACKED_EVENTS as readonly string[]).includes(
                    e.eventName
                  );
                  return (
                    <TableRow key={e.eventName}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs">{e.eventName}</span>
                          {tracked && (
                            <Badge className="bg-bds-status-info-subtle text-bds-status-info-text">
                              집계 사용
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(e.cnt)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatNumber(e.users)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatNumber(e.devices)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatKst(e.lastSeen)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )
        )}
      </CardContent>
    </Card>
  );
}

// ─── 공용 ───

/** compliance 화면의 Tile 과 같은 모양 — 두 화면의 리듬을 맞춘다. */
function Tile({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone?: "danger" | "warning";
  hint?: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-bds-caption2 text-bds-label-assistive">{label}</div>
      <div
        className={`mt-0.5 text-bds-title3 tabular-nums ${
          tone === "danger"
            ? "text-bds-status-error-text"
            : tone === "warning"
              ? "text-bds-status-warning-text"
              : "text-foreground"
        }`}
      >
        {formatNumber(value)}
      </div>
      {hint && (
        <div className="text-bds-caption2 text-bds-label-alternative">{hint}</div>
      )}
    </div>
  );
}

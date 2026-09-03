"use client";

import { useQuery } from "@tanstack/react-query";
import { BellRing } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/shared/ui/kit/table";
import { Badge } from "@/src/shared/ui/kit/badge";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { WarningBox } from "@/src/shared/ui/warning-box";
import { unwrap } from "@/src/shared/lib/unwrap";
import { formatNumber } from "@/src/shared/lib/format-number";
import { fetchCategoryReach } from "@/src/entities/notification";

/**
 * 카테고리별 발송 인원 — "채팅으로 쏘면 몇 명에게 가는가".
 *
 * 위 카드(전체 도달 가능 수)는 카테고리를 구분하지 않는다. 실제 발송 인원은
 * 카테고리마다 다르다 — 모임 운영 알림은 기본값이 OFF 이고(app migration 68),
 * 광고성은 옵트인이며, 채팅은 기본 ON 이다.
 *
 * 🔴 "허가" 라고 쓰지 않는다. 토큰은 OS 권한과 무관하게 저장되므로(app
 * migration 42) 이 수에는 권한을 거부한 사용자가 섞여 있다.
 */
export function CategoryReachCard() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["category-reach"],
    queryFn: () => unwrap(fetchCategoryReach()),
  });

  // 카테고리별 값을 더하면 한 사람이 여러 번 세어진다. 카테고리 중 최댓값이
  // "적어도 이만큼은 거부 상태" 라는 하한선으로 읽을 수 있는 유일한 수다.
  const deniedFloor =
    data?.reduce((max, c) => Math.max(max, c.permissionDeniedKnown), 0) ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="size-4" />
          카테고리별 발송 인원
        </CardTitle>
        <CardDescription>
          수신 동의와 토큰 보유를 함께 본 수 — 알림 생성 로직(
          <code>fn_enqueue_notification</code>)이 실제로 푸시를 밀어 넣는 인원과
          같은 기준입니다. 카테고리마다 기본값이 달라 같은 모수에서도 수가 갈립니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : isError ? (
          <QueryError error={error} onRetry={() => void refetch()} />
        ) : !data?.length ? (
          <EmptyState message="등록된 알림 카테고리가 없습니다." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>카테고리</TableHead>
                  <TableHead className="text-right">대상</TableHead>
                  <TableHead className="text-right">수신 ON</TableHead>
                  <TableHead className="text-right">발송 대상</TableHead>
                  <TableHead className="text-right">직접 끔</TableHead>
                  <TableHead className="text-right">기본값</TableHead>
                  <TableHead className="text-right">거부 확인</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((c) => (
                  <TableRow key={c.code}>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium">{c.label}</span>
                        <span className="text-bds-caption2 text-muted-foreground">
                          {c.code}
                        </span>
                        {c.isMandatory && <Badge size="xs">필수</Badge>}
                        {c.requiresHost && (
                          <Badge variant="outline-accent" size="xs">
                            모임장 전용
                          </Badge>
                        )}
                        {!c.isActive && <Badge variant="outline" size="xs">숨김</Badge>}
                        {!c.defaultEnabled && !c.isMandatory && (
                          <Badge variant="outline" size="xs">
                            기본 OFF
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(c.eligible)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(c.enabledUsers)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatNumber(c.reachable)}
                      <span className="ml-1 text-bds-caption2 font-normal text-muted-foreground">
                        (모임장 {formatNumber(c.reachableHost)})
                      </span>
                    </TableCell>
                    {/* 광고성은 정본이 users.marketing_opt_in 이라 설정 행이 아예
                        없다(app migration 52) — 세 열이 의미를 갖지 않는다. */}
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {c.storage === "SETTINGS" ? formatNumber(c.explicitOff) : "-"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {c.storage === "SETTINGS" ? formatNumber(c.byDefault) : "-"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatNumber(c.permissionDeniedKnown)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <WarningBox tone="caution">
              <b>발송 대상은 “알림 권한을 허용한 인원”이 아닙니다.</b> 푸시 토큰은
              권한과 무관하게 저장되므로(나중에 OS 설정에서 켜면 바로 닿아야
              하니까) 권한을 거부한 사용자도 이 수에 들어 있습니다. 맨 오른쪽 “거부
              확인”은 앱이 <b>권한을 요청한 순간</b>의 기록만 있어 하한선입니다 —
              그 뒤 OS 설정에서 끈 사람은 잡히지 않습니다.
              {deniedFloor > 0 && (
                <> 지금은 최소 {formatNumber(deniedFloor)}명이 거부 상태입니다.</>
              )}
            </WarningBox>

            <p className="text-bds-caption2 text-muted-foreground">
              “직접 끔”과 “기본값”을 나눠 세는 이유: 기본값이 OFF 인 카테고리에서
              둘을 합치면 <b>손대지 않은 사람</b>과 <b>끄겠다고 정한 사람</b>이
              뭉개집니다. 앞쪽은 권한 허용 시 자동으로 켜지는 대상이고, 뒤쪽은
              되살리면 안 되는 의사표시입니다.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

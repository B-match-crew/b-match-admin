"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { WarningBox } from "@/src/shared/ui/warning-box";
import { unwrap } from "@/src/shared/lib/unwrap";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { fetchUserConsents } from "@/src/features/compliance/actions";
import {
  AGREEMENT_LABEL,
  CONSENT_SOURCE_LABEL,
} from "@/src/features/compliance/constants";

/**
 * 유저 한 명의 동의 이력.
 *
 * 분쟁 대응은 요약이 아니라 **언제 무엇에 동의했는지**를 요구한다(개인정보
 * 보호법 §22 · 정보통신망법 §50). 이력은 append-only 라 맨 위 행이 현재
 * 상태이고, 그 아래가 증적이다.
 */
export function UserConsentsTab({ userId }: { userId: number }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["user-consents", userId],
    queryFn: () => unwrap(fetchUserConsents(userId)),
  });

  if (isError) {
    return (
      <QueryError section="동의 이력" error={error} onRetry={() => void refetch()} />
    );
  }
  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  const latestMarketing = data.marketing[0];
  // 미러(users.marketing_opt_in)와 정본(이력 최신 행)이 갈리면, 분쟁 때 어느
  // 값을 근거로 삼을지가 문제가 된다. 이 사람에게 그 문제가 있는지 먼저 알린다.
  const mismatch =
    data.marketing.length > 0 && latestMarketing.agreed !== data.mirrorOptIn;

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h4 className="text-bds-heading3">필수 약관</h4>
        {data.agreements.length === 0 ? (
          <>
            <EmptyState message="기록된 동의 이력이 없습니다." />
            <WarningBox tone="caution">
              동의를 받지 않았다는 뜻이 아니라 <b>서버가 기록을 갖지 못한</b>
              것입니다(동의 이력 기능 이전 가입 또는 구버전 앱). 분쟁 시 입증
              수단이 없습니다.
            </WarningBox>
          </>
        ) : (
          <ul className="max-h-56 space-y-1.5 overflow-y-auto">
            {data.agreements.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-2 rounded-md border px-2.5 py-2 text-xs"
              >
                <span className="font-medium">
                  {AGREEMENT_LABEL[a.agreement] ?? a.agreement}
                </span>
                <Badge
                  className={
                    a.agreed
                      ? "bg-bds-primary-100 text-bds-primary-900"
                      : "bg-bds-status-warning-subtle text-bds-status-warning-text"
                  }
                >
                  {a.agreed ? "동의" : "철회"}
                </Badge>
                <span className="text-muted-foreground">
                  {CONSENT_SOURCE_LABEL[a.source] ?? a.source}
                </span>
                <span className="font-mono text-muted-foreground">
                  {a.version ?? "버전없음"}
                </span>
                <span className="ml-auto shrink-0 text-muted-foreground">
                  {formatDateTime(a.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h4 className="text-bds-heading3">광고성 수신</h4>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-bds-label-assistive">현재 값(미러)</span>
          <Badge
            className={
              data.mirrorOptIn
                ? "bg-bds-primary-100 text-bds-primary-900"
                : "bg-bds-back-strong text-bds-label-neutral"
            }
          >
            {data.mirrorOptIn ? "동의" : "미동의"}
          </Badge>
        </div>
        {mismatch && (
          <WarningBox tone="danger">
            이력의 최신 값(<b>{latestMarketing.agreed ? "동의" : "철회"}</b>)과
            현재 값이 다릅니다. 정상 경로라면 트리거가 두 값을 항상 맞추므로,
            트리거를 우회한 수정이 있었다는 뜻입니다.
          </WarningBox>
        )}
        {data.marketing.length === 0 ? (
          <EmptyState message="광고성 동의 이력이 없습니다." />
        ) : (
          <ul className="max-h-40 space-y-1.5 overflow-y-auto">
            {data.marketing.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center gap-2 rounded-md border px-2.5 py-2 text-xs"
              >
                <Badge
                  className={
                    m.agreed
                      ? "bg-bds-primary-100 text-bds-primary-900"
                      : "bg-bds-status-warning-subtle text-bds-status-warning-text"
                  }
                >
                  {m.agreed ? "동의" : "철회"}
                </Badge>
                <span className="text-muted-foreground">
                  {CONSENT_SOURCE_LABEL[m.source] ?? m.source}
                </span>
                <span className="ml-auto shrink-0 text-muted-foreground">
                  {formatDateTime(m.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

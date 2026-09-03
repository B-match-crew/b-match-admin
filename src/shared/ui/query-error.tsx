"use client";

import { AlertTriangle, LogIn, RotateCw } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/src/shared/ui/kit/alert";
import { Button } from "@/src/shared/ui/kit/button";
import { cn } from "@/src/shared/lib/cn";
import { ActionFailure } from "@/src/shared/lib/unwrap";

/**
 * 쿼리 실패를 화면에 그대로 드러낸다.
 *
 * 어드민은 로그인 뒤에만 열리는 내부 도구라 PG 에러 코드를 감출 이유가 없다.
 * 오히려 `PGRST202` 한 줄이 보였다면 2026-08-13 통계 장애는 즉시 끝났다.
 * 그래서 code 를 뱃지로 병기한다.
 */
export function QueryError({
  error,
  onRetry,
  section,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  /** 어느 섹션이 죽었는지 — 카드 자리를 대체할 때 제목이 사라지지 않게. */
  section?: string;
  className?: string;
}) {
  const code = error instanceof ActionFailure ? error.code : undefined;
  // 세션이 끊긴 것은 "다시 시도" 로 풀리지 않는다 — 눌러도 같은 실패가 한 번 더
  // 서버로 갈 뿐이다. 갈 곳을 알려준다.
  const needsLogin = code === "AUTH_REQUIRED";
  const message =
    error instanceof Error && error.message
      ? error.message
      : "처리 중 오류가 발생했습니다";

  return (
    <Alert variant="destructive" className={cn("items-start", className)}>
      <AlertTriangle />
      <AlertTitle className="flex flex-wrap items-center gap-1.5">
        {section ? `${section} — 불러오지 못했습니다` : "불러오지 못했습니다"}
        {code && (
          <code className="rounded bg-bds-status-error-subtle px-1.5 py-0.5 font-mono text-bds-caption2 text-bds-status-error-text">
            {code}
          </code>
        )}
      </AlertTitle>
      <AlertDescription className="break-words">{message}</AlertDescription>
      {needsLogin ? (
        <div className="col-start-2 mt-2">
          <Link href="/login">
            <Button variant="outline" size="sm">
              <LogIn />
              다시 로그인
            </Button>
          </Link>
        </div>
      ) : (
        onRetry && (
          <div className="col-start-2 mt-2">
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RotateCw />
              다시 시도
            </Button>
          </div>
        )
      )}
    </Alert>
  );
}

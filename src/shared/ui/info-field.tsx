import { cn } from "@/src/shared/lib/cn";

/**
 * 상세 다이얼로그의 "라벨 - 값" 한 칸.
 *
 * user-detail-dialog / matches-client / reports-client / audit-logs-client 에
 * 각각 로컬 `Info` 로 중복 정의돼 있던 것을 공용화했다.
 */
export function InfoField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="text-bds-caption2 text-bds-label-assistive">
        {label}
      </span>
      <div className="mt-0.5 text-bds-body3 text-foreground">{children}</div>
    </div>
  );
}

/** InfoField 들을 담는 표준 그리드 컨테이너 */
export function InfoGrid({
  columns = 2,
  children,
  className,
}: {
  columns?: 1 | 2 | 3;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-3 rounded-lg border border-bds-border-alternative bg-bds-back-alternative p-3",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  );
}

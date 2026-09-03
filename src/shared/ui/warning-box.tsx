import { cn } from "@/src/shared/lib/cn";

/**
 * 다이얼로그 안의 경고/주의 안내 박스.
 *
 * user-action-dialog / matches-client / reports-client 세 곳에 같은 클래스
 * 문자열이 복붙돼 있던 것을 하나로 모았다.
 */
export function WarningBox({
  tone = "danger",
  children,
  className,
}: {
  tone?: "danger" | "caution";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md border p-2 text-bds-caption2",
        tone === "danger" &&
          "border-bds-status-error/40 bg-bds-status-error-subtle text-bds-status-error-text",
        tone === "caution" &&
          "border-bds-status-warning/40 bg-bds-status-warning-subtle text-bds-status-warning-text",
        className
      )}
    >
      {children}
    </div>
  );
}

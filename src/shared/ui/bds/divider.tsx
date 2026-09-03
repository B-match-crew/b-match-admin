import { cn } from "@/src/shared/lib/cn";

/**
 * BdsDivider (bds_divider.dart) 이식.
 *
 * regular/bold 는 라인이 아니라 섹션 구분용 "두꺼운 띠" 이므로 배경색 블록으로
 * 구현한다 (원본과 동일한 의도).
 */
export function Divider({
  type = "thin",
  orientation = "horizontal",
  className,
}: {
  type?: "thin" | "regular" | "bold";
  orientation?: "horizontal" | "vertical";
  className?: string;
}) {
  if (orientation === "vertical") {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={cn("w-px self-stretch bg-bds-border-alternative", className)}
      />
    );
  }

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={cn(
        "w-full",
        type === "thin" && "h-px bg-bds-border-alternative",
        type === "regular" && "h-2 bg-bds-back-strong",
        type === "bold" && "h-3 bg-bds-back-strong",
        className
      )}
    />
  );
}

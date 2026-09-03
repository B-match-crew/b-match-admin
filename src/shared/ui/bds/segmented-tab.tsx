"use client";

import { cn } from "@/src/shared/lib/cn";

/**
 * BdsSelectedTab (bds_selected_tab.dart) 이식 — segmented control.
 *
 * 컨테이너 backStrong + padding 3, active pill 은 흰 배경 radius 10 +
 * shadow 0 0 4px rgba(0,0,0,0.08). 원본은 슬라이드 애니메이션 없이 즉시 전환.
 */
const SIZES = {
  sm: { h: "h-8", text: "text-bds-body2" },
  md: { h: "h-10", text: "text-bds-heading3" },
  lg: { h: "h-12", text: "text-bds-heading3" },
} as const;

export interface SegmentedTabItem<T extends string> {
  value: T;
  label: string;
}

export function SegmentedTab<T extends string>({
  items,
  value,
  onValueChange,
  size = "lg",
  className,
}: {
  items: readonly SegmentedTabItem<T>[];
  value: T;
  onValueChange: (v: T) => void;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex w-full items-stretch gap-0 rounded-lg bg-bds-back-strong p-[3px]",
        className
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(item.value)}
            className={cn(
              "flex-1 rounded-[10px] transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              s.h,
              s.text,
              active
                ? "bg-white text-bds-label-normal shadow-[0_0_4px_rgba(0,0,0,0.08)]"
                : "text-bds-label-alternative hover:text-bds-label-normal"
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

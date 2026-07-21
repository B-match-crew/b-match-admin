"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * BdsChip (bds_chip.dart) 이식 — 분류/필터용 pill.
 *
 * 원본과의 차이:
 *   - selected 시 font-weight 가 500→600 으로 바뀌어 레이아웃이 흔들리는 문제가
 *     있어, 웹에서는 굵기 변화만큼의 폭을 미리 확보한다 (아래 ::after 트릭 대신
 *     간단히 selected/unselected 모두 동일 tracking 을 쓰고 폰트만 교체).
 *   - hover 는 BDS 에 없어 신규 정의.
 */
const chipVariants = cva(
  "inline-flex items-center justify-center rounded-[36px] whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      size: {
        // BDS small — px 14 / py 7
        sm: "gap-1.5 px-3.5 py-[7px] text-bds-body3 [&_svg:not([class*='size-'])]:size-4",
        // BDS medium — px 16 / py 8
        md: "gap-1.5 px-4 py-2 text-bds-body1 [&_svg:not([class*='size-'])]:size-5",
      },
      selected: {
        true: "bg-bds-gray-800 font-semibold text-bds-label-contrast hover:bg-[var(--bds-secondary-hover)]",
        false:
          "bg-bds-back-alternative text-bds-gray-700 hover:bg-bds-back-strong",
      },
    },
    compoundVariants: [
      // disabled 는 selected 보다 우선 (원본 동작과 동일)
      {
        className:
          "disabled:bg-bds-interaction-disable disabled:text-bds-label-disable",
      },
    ],
    defaultVariants: { size: "sm", selected: false },
  }
);

export interface ChipProps
  extends Omit<React.ComponentProps<"button">, "children">,
    VariantProps<typeof chipVariants> {
  label: string;
  /** selected 일 때 앞에 체크 아이콘 노출 (BDS showCheckWhenSelected) */
  showCheckWhenSelected?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

export function Chip({
  className,
  size,
  selected = false,
  showCheckWhenSelected = false,
  leading,
  trailing,
  label,
  ...props
}: ChipProps) {
  return (
    <button
      type="button"
      data-slot="chip"
      aria-pressed={selected ?? false}
      className={cn(chipVariants({ size, selected, className }))}
      {...props}
    >
      {showCheckWhenSelected && selected ? <Check /> : leading}
      {label}
      {trailing}
    </button>
  );
}

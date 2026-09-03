"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/src/shared/lib/cn"

// BdsButton (bds_button.dart) 이식.
//   - radius 12 (AppRadius.lg) 전 사이즈 공통
//   - 사이즈별 height 는 BDS 의 padding+lineHeight 계산 결과와 동일하게 맞춤
//     (large 48 / medium 40 / small 32 / xsmall 22)
//   - variant 이름은 shadcn 호출부 호환을 위해 유지하고 색만 BDS 로 매핑:
//     default→solid primary, secondary→solid secondary, outline→outlined
//     secondary, ghost→assistive, destructive→statusError(BDS 미정의, 신규)
//   - hover/active 는 BDS 에 없어 --bds-*-hover/active 토큰으로 신규 정의
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-bds-primary-500 text-bds-gray-950 hover:bg-[var(--bds-primary-hover)] active:bg-[var(--bds-primary-active)] disabled:bg-bds-interaction-disable disabled:text-bds-label-disable",
        outline:
          "border-bds-border-normal bg-transparent text-bds-gray-800 hover:bg-[var(--bds-hover-overlay)] active:bg-[var(--bds-active-overlay)] disabled:border-bds-interaction-disable disabled:bg-transparent disabled:text-bds-label-disable",
        secondary:
          "bg-bds-gray-800 text-bds-label-contrast hover:bg-[var(--bds-secondary-hover)] active:bg-[var(--bds-secondary-active)] disabled:bg-bds-interaction-disable disabled:text-bds-label-disable",
        ghost:
          "bg-bds-back-strong text-bds-gray-950 hover:bg-[var(--bds-assistive-hover)] active:bg-[var(--bds-assistive-active)] disabled:bg-bds-interaction-disable disabled:text-bds-label-disable",
        destructive:
          "bg-bds-status-error text-white hover:bg-[var(--bds-destructive-hover)] active:bg-[var(--bds-destructive-hover)] focus-visible:ring-destructive/30 disabled:bg-bds-interaction-disable disabled:text-bds-label-disable",
        link: "text-bds-primary-900 underline-offset-4 hover:underline disabled:text-bds-label-disable",
      },
      size: {
        // BDS large — px 28 / py 12 / heading3
        lg: "h-12 gap-1.5 px-7 text-bds-heading3 has-data-[icon=inline-end]:pr-6 has-data-[icon=inline-start]:pl-6 [&_svg:not([class*='size-'])]:size-6",
        // BDS medium — px 20 / py 8 / heading3
        default:
          "h-10 gap-1.5 px-5 text-bds-heading3 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4 [&_svg:not([class*='size-'])]:size-5",
        // BDS small — px 14 / py 6 / body2
        sm: "h-8 gap-1.5 px-3.5 text-bds-body2 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-5",
        // BDS xsmall — px 10 / py 3 / caption2
        xs: "h-[22px] gap-1.5 px-2.5 text-bds-caption2 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-4",
        icon: "size-10 [&_svg:not([class*='size-'])]:size-5",
        "icon-xs": "size-[22px] [&_svg:not([class*='size-'])]:size-4",
        "icon-sm": "size-8 [&_svg:not([class*='size-'])]:size-5",
        "icon-lg": "size-12 [&_svg:not([class*='size-'])]:size-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

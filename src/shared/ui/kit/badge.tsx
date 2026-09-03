import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/src/shared/lib/cn"

// BdsBadge (bds_badge.dart) 이식 — radius 6 고정, caption 타이포, 인터랙션 없음.
// size 는 BDS 의 xsmall/small/medium (padding 6·3 / 8·4 / 10·5) 을 그대로 따른다.
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-0.5 overflow-hidden rounded-[6px] border border-transparent whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default:
          "bg-bds-back-strong text-bds-label-neutral [a]:hover:bg-bds-gray-200",
        secondary: "bg-bds-gray-800 text-bds-label-contrast",
        accent: "bg-bds-accent-50 text-bds-accent-600",
        destructive: "bg-bds-status-error/10 text-bds-status-error",
        outline: "border-bds-border-alternative text-bds-label-neutral",
        "outline-accent": "border-bds-accent-200 text-bds-accent-600",
        ghost: "hover:bg-bds-back-strong hover:text-bds-label-neutral",
        link: "text-bds-primary-900 underline-offset-4 hover:underline",
      },
      size: {
        xs: "px-1.5 py-[3px] text-bds-caption3 [&>svg]:size-3",
        sm: "px-2 py-1 text-bds-caption2 [&>svg]:size-3.5",
        md: "px-2.5 py-[5px] text-bds-caption2 [&>svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  }
)

function Badge({
  className,
  variant = "default",
  size = "sm",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant, size }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }

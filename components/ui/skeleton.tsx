import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      // BdsSkeleton — animate-pulse 가 아니라 원본과 같은 gray200→gray100 shimmer
      className={cn("bds-shimmer rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }

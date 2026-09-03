import { cn } from "@/src/shared/lib/cn";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export function LoadingSpinner({ className, size = "md" }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center py-8", className)}>
      {/* BDS 는 브랜드색을 텍스트/아이콘에 쓸 때 primary900 을 쓴다
          (primary500 은 흰 배경에서 대비가 부족) */}
      <Loader2 className={cn("animate-spin text-bds-primary-900", sizeMap[size])} />
    </div>
  );
}

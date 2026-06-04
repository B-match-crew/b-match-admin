import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, { label: string; style: string }> = {
  // 유저 상태 (UserStatus)
  ACTIVE: { label: "정상", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  SUSPENDED: { label: "정지", style: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  BANNED: { label: "영구차단", style: "bg-red-50 text-red-700 border-red-200" },
  DELETED: { label: "탈퇴", style: "bg-gray-50 text-gray-500 border-gray-200" },

  // 매칭 상태 (MatchStatus)
  RECRUITING: { label: "모집중", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CLOSED: { label: "마감", style: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  ENDED: { label: "종료", style: "bg-gray-50 text-gray-500 border-gray-200" },

  // 권한
  SUPER_ADMIN: { label: "최고 관리자", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  MANAGER: { label: "매니저", style: "bg-blue-50 text-blue-700 border-blue-200" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusStyles[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        config?.style ?? "bg-gray-50 text-gray-700 border-gray-200",
        className
      )}
    >
      {config?.label ?? status}
    </Badge>
  );
}

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  // 유저 상태
  정상: "bg-emerald-50 text-emerald-700 border-emerald-200",
  정지: "bg-red-50 text-red-700 border-red-200",
  탈퇴: "bg-gray-50 text-gray-500 border-gray-200",
  // 매칭 상태
  모집중: "bg-emerald-50 text-emerald-700 border-emerald-200",
  마감: "bg-yellow-50 text-yellow-700 border-yellow-200",
  종료: "bg-gray-50 text-gray-500 border-gray-200",
  취소: "bg-red-50 text-red-700 border-red-200",
  // 신고 상태
  "처리 대기": "bg-yellow-50 text-yellow-700 border-yellow-200",
  경고: "bg-orange-50 text-orange-700 border-orange-200",
  무혐의: "bg-blue-50 text-blue-700 border-blue-200",
  // 광고 상태
  "검수 대기": "bg-yellow-50 text-yellow-700 border-yellow-200",
  승인: "bg-emerald-50 text-emerald-700 border-emerald-200",
  반려: "bg-red-50 text-red-700 border-red-200",
  "노출 중": "bg-blue-50 text-blue-700 border-blue-200",
  // 신청 상태
  "승인 대기": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "입금 대기": "bg-orange-50 text-orange-700 border-orange-200",
  "참여 확정": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "신청 거절": "bg-red-50 text-red-700 border-red-200",
  노쇼: "bg-red-50 text-red-700 border-red-200",
  // 알림 상태
  대기: "bg-yellow-50 text-yellow-700 border-yellow-200",
  발송됨: "bg-emerald-50 text-emerald-700 border-emerald-200",
  실패: "bg-red-50 text-red-700 border-red-200",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        statusStyles[status] ?? "bg-gray-50 text-gray-700 border-gray-200",
        className
      )}
    >
      {status}
    </Badge>
  );
}

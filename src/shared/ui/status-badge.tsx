import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, { label: string; style: string }> = {
  // 유저 상태
  ACTIVE: { label: "정상", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  SUSPENDED: { label: "정지", style: "bg-red-50 text-red-700 border-red-200" },
  BANNED: { label: "차단", style: "bg-red-50 text-red-700 border-red-200" },
  DELETED: { label: "탈퇴", style: "bg-gray-50 text-gray-500 border-gray-200" },
  // 매칭 상태
  RECRUITING: { label: "모집중", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CLOSED: { label: "마감", style: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  IN_PROGRESS: { label: "진행중", style: "bg-blue-50 text-blue-700 border-blue-200" },
  ENDED: { label: "종료", style: "bg-gray-50 text-gray-500 border-gray-200" },
  CANCELED_BY_HOST: { label: "호스트 취소", style: "bg-red-50 text-red-700 border-red-200" },
  CANCELED_BY_ADMIN: { label: "관리자 취소", style: "bg-red-50 text-red-700 border-red-200" },
  // 신고 상태
  PENDING: { label: "대기", style: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  ON_HOLD: { label: "보류", style: "bg-purple-50 text-purple-700 border-purple-200" },
  RESOLVED: { label: "처리완료", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "반려", style: "bg-blue-50 text-blue-700 border-blue-200" },
  // 신청 상태
  PENDING_APPROVAL: { label: "승인 대기", style: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  PENDING_PAYMENT: { label: "입금 대기", style: "bg-orange-50 text-orange-700 border-orange-200" },
  CONFIRMED: { label: "참여 확정", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CANCELED_BY_GUEST: { label: "게스트 취소", style: "bg-gray-50 text-gray-500 border-gray-200" },
  REJECTED_BY_HOST: { label: "호스트 거절", style: "bg-red-50 text-red-700 border-red-200" },
  // 결제 상태
  PAID: { label: "결제완료", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CANCELED: { label: "취소", style: "bg-gray-50 text-gray-500 border-gray-200" },
  REFUNDED: { label: "환불", style: "bg-blue-50 text-blue-700 border-blue-200" },
  // 정산 상태
  EXPORTED: { label: "내보내기", style: "bg-blue-50 text-blue-700 border-blue-200" },
  COMPLETED: { label: "완료", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  FAILED: { label: "실패", style: "bg-red-50 text-red-700 border-red-200" },
  // 알림 상태
  SENT: { label: "발송됨", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  // 커뮤니티 블라인드 상태
  VISIBLE: { label: "공개", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  BLINDED: { label: "블라인드", style: "bg-red-50 text-red-700 border-red-200" },
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

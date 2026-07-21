import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

/**
 * 상태값 → BDS 톤 매핑.
 *
 * BDS 배지는 neutral/accent 두 색만 정의돼 있어 관리자의 상태 구분에는 부족하다.
 * 그래서 BDS 팔레트 안에서 5개 톤을 뽑아 쓴다 (신규 색은 만들지 않음):
 *   positive → primary100 / primary900   (브랜드 민트)
 *   warning  → status-warning tint/text
 *   danger   → status-error tint/text
 *   info     → status-info tint/text
 *   neutral  → backStrong / labelNeutral
 */
const TONES = {
  positive: "bg-bds-primary-100 text-bds-primary-900",
  warning: "bg-bds-status-warning-subtle text-bds-status-warning-text",
  danger: "bg-bds-status-error-subtle text-bds-status-error-text",
  info: "bg-bds-status-info-subtle text-bds-status-info-text",
  neutral: "bg-bds-back-strong text-bds-label-neutral",
} as const;

type Tone = keyof typeof TONES;

const statusConfig: Record<string, { label: string; tone: Tone }> = {
  // 유저 상태 (UserStatus)
  ACTIVE: { label: "정상", tone: "positive" },
  SUSPENDED: { label: "정지", tone: "warning" },
  BANNED: { label: "영구차단", tone: "danger" },
  DELETED: { label: "탈퇴", tone: "neutral" },

  // 매칭 상태 (MatchStatus)
  RECRUITING: { label: "모집중", tone: "positive" },
  CLOSED: { label: "마감", tone: "warning" },
  ENDED: { label: "종료", tone: "neutral" },

  // 권한
  SUPER_ADMIN: { label: "최고 관리자", tone: "positive" },
  MANAGER: { label: "매니저", tone: "info" },

  // 신고 처리 상태 (ReportStatus)
  PENDING: { label: "미처리", tone: "warning" },
  REVIEWED: { label: "검토중", tone: "info" },
  ACTIONED: { label: "조치완료", tone: "positive" },
  DISMISSED: { label: "반려", tone: "neutral" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge className={cn(TONES[config?.tone ?? "neutral"], className)}>
      {config?.label ?? status}
    </Badge>
  );
}

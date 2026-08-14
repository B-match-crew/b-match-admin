import {
  LayoutDashboard,
  ChartColumn,
  Activity,
  Users,
  Users2,
  Ban,
  Swords,
  Flag,
  MessageSquareWarning,
  ClipboardList,
  Rocket,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import type { AdminRole } from "@/src/shared/types/db";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** 접근 가능한 역할 목록. 비어있으면 모든 역할 접근 가능 */
  roles?: AdminRole[];
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const navigation: NavGroup[] = [
  {
    items: [
      { title: "대시보드", href: "/", icon: LayoutDashboard },
      { title: "통계", href: "/stats", icon: ChartColumn },
      { title: "분석", href: "/analytics", icon: Activity },
    ],
  },
  {
    label: "운영",
    items: [
      { title: "유저 관리", href: "/users", icon: Users },
      { title: "모임 관리", href: "/clubs", icon: Users2 },
      { title: "매칭 관리", href: "/matches", icon: Swords },
      { title: "신고 관리", href: "/reports", icon: Flag },
      { title: "채팅 신고", href: "/chat-reports", icon: MessageSquareWarning },
      { title: "차단 관리", href: "/blocks", icon: Ban },
    ],
  },
  {
    label: "시스템",
    items: [
      { title: "앱 관리", href: "/app-version", icon: Rocket },
      { title: "공지 발송", href: "/notices", icon: Megaphone },
      {
        title: "감사 로그",
        href: "/audit-logs",
        icon: ClipboardList,
        roles: ["SUPER_ADMIN"],
      },
    ],
  },
];

import {
  LayoutDashboard,
  Users,
  Swords,
  Flag,
  Bell,
  BarChart3,
  Settings,
  Megaphone,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  children?: NavItem[];
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const navigation: NavGroup[] = [
  {
    items: [
      { title: "대시보드", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    label: "관리",
    items: [
      { title: "유저 관리", href: "/users", icon: Users },
      { title: "매칭 관리", href: "/matchings", icon: Swords },
      { title: "신고 관리", href: "/reports", icon: Flag },
    ],
  },
  {
    label: "운영",
    items: [
      { title: "알림 발송", href: "/notifications", icon: Bell },
      {
        title: "분석",
        href: "/analytics",
        icon: BarChart3,
        children: [
          { title: "GA4 이벤트", href: "/analytics", icon: BarChart3 },
          { title: "퍼널 분석", href: "/analytics/funnel", icon: BarChart3 },
        ],
      },
      { title: "배티켓 설정", href: "/settings", icon: Settings },
    ],
  },
  {
    label: "광고",
    items: [
      {
        title: "광고 관리",
        href: "/ads",
        icon: Megaphone,
        children: [
          { title: "배너 광고", href: "/ads", icon: Megaphone },
          { title: "소재 승인", href: "/ads/review", icon: Megaphone },
          { title: "지도 핀 광고", href: "/ads/pins", icon: Megaphone },
          { title: "광고 성과", href: "/ads/performance", icon: Megaphone },
        ],
      },
    ],
  },
];

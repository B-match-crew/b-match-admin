import {
  LayoutDashboard,
  Users,
  Swords,
  Flag,
  Bell,
  Settings,
  Ticket,
  Wallet,
  HandCoins,
  ClipboardList,
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
      { title: "사용자 관리", href: "/users", icon: Users },
      { title: "매칭 관리", href: "/matches", icon: Swords },
      { title: "CS 분쟁 관리", href: "/disputes", icon: Flag },
    ],
  },
  {
    label: "운영",
    items: [
      { title: "푸시 관리", href: "/push", icon: Bell },
      { title: "배티켓 관리", href: "/batticket", icon: Ticket },
    ],
  },
  {
    label: "재무",
    items: [
      { title: "재무 대시보드", href: "/finance", icon: Wallet },
      { title: "정산 관리", href: "/settlements", icon: HandCoins },
    ],
  },
  {
    label: "시스템",
    items: [
      { title: "감사 로그", href: "/audit", icon: ClipboardList },
      { title: "설정", href: "/settings", icon: Settings },
    ],
  },
];

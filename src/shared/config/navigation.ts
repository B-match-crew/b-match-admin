import {
  LayoutDashboard,
  Users,
  Swords,
  ClipboardList,
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
    items: [{ title: "대시보드", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "운영",
    items: [
      { title: "유저 관리", href: "/users", icon: Users },
      { title: "매칭 관리", href: "/matches", icon: Swords },
    ],
  },
  {
    label: "시스템",
    items: [
      {
        title: "감사 로그",
        href: "/audit-logs",
        icon: ClipboardList,
        roles: ["SUPER_ADMIN"],
      },
    ],
  },
];

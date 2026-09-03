"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation } from "@/src/shared/config/navigation";
import { useAuth } from "@/src/app/providers/auth-provider";
import { canAccessRoute } from "@/src/shared/lib/client-roles";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/src/shared/ui/kit/sidebar";
import { Badge } from "@/src/shared/ui/kit/badge";
import { Logo } from "@/src/shared/ui/brand/logo";

export function AppSidebar() {
  const pathname = usePathname();
  const { role } = useAuth();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo height={22} />
          <span className="text-bds-caption1 text-bds-label-assistive">
            Admin
          </span>
        </Link>
        {role && (
          <Badge variant="outline" className="mt-2 text-xs w-fit">
            {role === "SUPER_ADMIN" ? "최고 관리자" : "매니저"}
          </Badge>
        )}
      </SidebarHeader>
      <SidebarContent>
        {navigation.map((group, groupIndex) => {
          const visibleItems = group.items.filter((item) =>
            canAccessRoute(role, item.roles)
          );
          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={groupIndex}>
              {group.label && (
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              )}
              <SidebarMenu>
                {visibleItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive(item.href)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}

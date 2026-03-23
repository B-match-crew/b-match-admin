"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navigation } from "@/src/shared/config/navigation";
import { useAuth } from "@/src/app/providers/auth-provider";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Swords } from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();
  const { role } = useAuth();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const canAccess = (item: { roles?: string[] }) => {
    if (!item.roles || item.roles.length === 0) return true;
    if (!role) return false;
    return item.roles.includes(role);
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Swords className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-sidebar-foreground">
            B-Match Admin
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
          const visibleItems = group.items.filter(canAccess);
          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={groupIndex}>
              {group.label && (
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              )}
              <SidebarMenu>
                {visibleItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    {item.children ? (
                      <>
                        <SidebarMenuButton
                          className={cn(
                            isActive(item.href) &&
                              "bg-sidebar-accent text-sidebar-accent-foreground"
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                        <SidebarMenuSub>
                          {item.children.filter(canAccess).map((child) => (
                            <SidebarMenuSubItem key={child.href}>
                              <SidebarMenuSubButton
                                render={<Link href={child.href} />}
                                isActive={isActive(child.href)}
                              >
                                {child.title}
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </>
                    ) : (
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive(item.href)}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    )}
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

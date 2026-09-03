"use client";

import { SidebarProvider, SidebarInset } from "@/src/shared/ui/kit/sidebar";
import { AppSidebar } from "./sidebar";
import { AppHeader } from "./header";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

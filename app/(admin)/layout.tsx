import { TooltipProvider } from "@/src/shared/ui/kit/tooltip";
import { AuthGuard } from "@/src/app/layouts/auth-guard";
import { AdminLayout } from "@/src/app/layouts/admin-layout";

export default function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <AuthGuard>
        <AdminLayout>{children}</AdminLayout>
      </AuthGuard>
    </TooltipProvider>
  );
}

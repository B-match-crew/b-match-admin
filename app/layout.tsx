import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { SupabaseProvider } from "@/src/app/providers/supabase-provider";
import { AuthProvider } from "@/src/app/providers/auth-provider";
import { ToastProvider } from "@/src/app/providers/toast-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminLayout } from "@/src/app/layouts/admin-layout";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "B-Match Admin",
  description: "B-Match 관리자 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body
        className={`${geistMono.variable} antialiased`}
        style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif" }}
      >
        <SupabaseProvider>
          <AuthProvider>
            <TooltipProvider>
              <AdminLayout>{children}</AdminLayout>
            </TooltipProvider>
            <ToastProvider />
          </AuthProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}

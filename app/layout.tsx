import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { SupabaseProvider } from "@/src/app/providers/supabase-provider";
import { AuthProvider } from "@/src/app/providers/auth-provider";
import { QueryProvider } from "@/src/app/providers/query-provider";
import { ToastProvider } from "@/src/app/providers/toast-provider";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 파비콘/OG 이미지는 Next 파일 컨벤션으로 자동 주입된다:
//   app/icon.png            → <link rel="icon">
//   app/opengraph-image.png → og:image (+ twitter:image), 크기까지 자동
// 그래서 여기서 icons/openGraph.images 를 따로 선언하지 않는다.
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: {
    default: "b-match 관리자",
    template: "%s | b-match 관리자",
  },
  description: "b-match 운영 관리자 콘솔",
  openGraph: {
    title: "b-match 관리자",
    description: "b-match 운영 관리자 콘솔",
    siteName: "b-match 관리자",
    locale: "ko_KR",
    type: "website",
  },
  // 관리자 콘솔은 검색 노출 대상이 아니다
  robots: { index: false, follow: false },
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
        {/* 관리자 셸(사이드바/헤더)과 인증 가드는 (admin) route group 의
            layout 에만 있다. 로그인 페이지는 이 셸 밖에서 전체화면으로 뜬다. */}
        <SupabaseProvider>
          <AuthProvider>
            <QueryProvider>
              {children}
              <ToastProvider />
            </QueryProvider>
          </AuthProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/app/providers/auth-provider";
import { LoadingSpinner } from "@/src/shared/ui/loading-spinner";

/**
 * 관리자 셸 클라이언트 가드.
 *
 * proxy.ts 가 서버 요청 단에서 이미 미인증을 /login 으로 막지만, 그것만으로는
 * "로그아웃 후 뒤로가기로 캐시된 화면이 보이는" 클라이언트 상황을 못 막는다.
 * 세션이 사라지면(로그아웃/만료) 여기서 즉시 /login 으로 밀어낸다.
 *
 * 역할까지 본다 — 세션은 있으나 admin_role 이 없는 계정(일반 유저가 어떻게든
 * 세션을 얻은 경우)도 들여보내지 않는다.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, role, isLoading } = useAuth();
  const router = useRouter();

  const denied = !isLoading && (!user || !role);

  useEffect(() => {
    if (denied) {
      router.replace("/login");
    }
  }, [denied, router]);

  // 인증 확인 전 / 리다이렉트 진행 중에는 보호된 화면을 그리지 않는다
  if (isLoading || denied) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}

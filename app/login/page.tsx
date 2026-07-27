"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { useAuth } from "@/src/app/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/src/shared/ui/brand/logo";
import { toast } from "sonner";

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
      // 쿠키가 완전히 세팅된 후 전체 리로드로 proxy 가 인증을 확인하도록
      window.location.href = "/";
    } catch (err) {
      toast.error(
        err instanceof Error && err.message.includes("권한")
          ? err.message
          : "로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요."
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* 좌: 커버 이미지 (모바일에서는 숨김) */}
      <div className="relative hidden w-1/2 lg:block">
        <img
          src="/assets/login-cover.webp"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* 하단 가독성용 그라데이션 + 로고 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
        <div className="absolute bottom-10 left-10">
          <p className="text-bds-title3 text-white drop-shadow-sm">
            나에게 딱 맞는 배드민턴 모임
          </p>
          <p className="mt-1 text-bds-body2 text-white/80 drop-shadow-sm">
            b-match 운영 관리자 콘솔
          </p>
        </div>
      </div>

      {/* 우: 로그인 폼 */}
      <div className="flex w-full items-center justify-center bg-bds-back-base px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <Logo height={30} />
            <h1 className="mt-5 text-bds-heading2 text-foreground">
              관리자 콘솔
            </h1>
            <p className="mt-1 text-bds-body3 text-bds-label-alternative">
              관리자 계정으로 로그인하세요
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-bds-body2" htmlFor="email">
                이메일
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@b-match.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-bds-body2" htmlFor="password">
                비밀번호
              </label>
              <Input
                id="password"
                type="password"
                placeholder="비밀번호 입력"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "로그인 중..." : "로그인"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

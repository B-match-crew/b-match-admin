"use client";

import { useState } from "react";
import { useAuth } from "@/src/app/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Swords } from "lucide-react";
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
      // 쿠키가 완전히 세팅된 후 전체 리로드로 proxy가 인증을 확인하도록
      window.location.href = "/";
    } catch {
      toast.error("로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bm-bg-surface)]">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Swords className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl">B-Match Admin</CardTitle>
          <p className="text-sm text-muted-foreground">
            관리자 계정으로 로그인하세요
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                이메일
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@b-match.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                비밀번호
              </label>
              <Input
                id="password"
                type="password"
                placeholder="비밀번호 입력"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "로그인 중..." : "로그인"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

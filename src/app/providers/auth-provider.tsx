"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSupabase } from "./supabase-provider";
import type { User } from "@supabase/supabase-js";
import type { AdminRole } from "@/src/shared/types/db";

interface AuthContextType {
  user: User | null;
  role: AdminRole | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAdminRole = async (
    authUserId: string
  ): Promise<AdminRole | null> => {
    const { data, error } = await supabase
      .from("users")
      .select("admin_role, deleted_at")
      .eq("auth_user_id", authUserId)
      .single();

    if (error || !data || data.deleted_at) return null;
    return (data.admin_role as AdminRole | null) ?? null;
  };

  useEffect(() => {
    // 실패해도 로딩을 끝낸다 — 예전엔 catch 가 없어 세션 조회가 한 번 실패하면
    // 로딩 스피너가 영원히 돌았다.
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          setRole(await fetchAdminRole(currentUser.id));
        }
      })
      .catch(() => {
        setUser(null);
        setRole(null);
      })
      .finally(() => setIsLoading(false));

    // 🔴 콜백 안에서 다른 Supabase 호출을 await 하지 않는다. supabase-js 는 이
    //    콜백을 인증 잠금 안에서 부르므로, 안에서 쿼리를 기다리면 그 쿼리가 같은
    //    잠금을 기다려 교착될 수 있다(supabase-js 문서의 경고). 조회는 콜백이 끝난
    //    뒤로 미룬다.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (!currentUser) {
        setRole(null);
        return;
      }
      setTimeout(() => {
        void fetchAdminRole(currentUser.id)
          .then(setRole)
          .catch(() => setRole(null));
      }, 0);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    // admin_role 사전 검증: 일반 유저는 즉시 signOut
    if (data.user) {
      const adminRole = await fetchAdminRole(data.user.id);
      if (!adminRole) {
        await supabase.auth.signOut();
        throw new Error("관리자 권한이 없는 계정입니다");
      }
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    // 전체 리로드로 /login 이동 — React Query 캐시·컴포넌트 상태를 완전히
    // 비워 로그아웃 후 뒤로가기로 보호 화면이 남는 것을 막는다.
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, role, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

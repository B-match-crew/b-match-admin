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

  const fetchAdminRole = async (userId: string): Promise<AdminRole | null> => {
    const { data, error } = await supabase
      .from("users")
      .select("admin_role, is_deleted")
      .eq("id", userId)
      .single();

    if (error || !data || data.is_deleted) return null;
    return (data.admin_role as AdminRole | null) ?? null;
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        setRole(await fetchAdminRole(currentUser.id));
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        setRole(await fetchAdminRole(currentUser.id));
      } else {
        setRole(null);
      }
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
    setRole(null);
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

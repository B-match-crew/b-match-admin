import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Server Component / Server Action / Route Handler 에서 사용하는
 * 사용자 세션 기반 Supabase 클라이언트.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component 에서 호출되면 set 불가 — 무시
          }
        },
      },
    }
  );
}

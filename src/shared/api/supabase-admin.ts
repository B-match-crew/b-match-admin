import { createClient } from "@supabase/supabase-js";

/**
 * 서버 사이드 전용 Supabase 관리자 클라이언트
 * service_role 키를 사용하여 RLS를 우회합니다.
 * Server Actions / Route Handlers에서만 사용하세요.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다"
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

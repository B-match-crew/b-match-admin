"use server";

import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { runAction, type ActionResult } from "@/src/shared/lib/action-result";
import { requireAdmin } from "@/src/shared/lib/role-guard";
import type { UserConsents } from "@/src/entities/user/model/consents";

/**
 * 유저 한 명의 동의 이력.
 *
 * 집계가 아니라 한 사람의 행을 시간순으로 그대로 보여준다 — 분쟁 대응은
 * 요약이 아니라 **언제 무엇에 동의했는지**를 요구한다.
 *
 * 세 조회를 Promise.all 로 함께 띄운다(왕복 3 → 1 라운드).
 */
export async function fetchUserConsents(
  userId: number
): Promise<ActionResult<UserConsents>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();

    const [agreementRes, marketingRes, userRes] = await Promise.all([
      supabase
        .from("user_agreements")
        .select("id, agreement, agreed, version, source, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("marketing_consents")
        .select("id, agreed, source, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("users")
        .select("marketing_opt_in")
        .eq("id", userId)
        .single(),
    ]);
    if (agreementRes.error) throw agreementRes.error;
    if (marketingRes.error) throw marketingRes.error;
    if (userRes.error) throw userRes.error;

    return {
      agreements: (agreementRes.data ?? []).map((a) => ({
        id: a.id as number,
        agreement: a.agreement as string,
        agreed: Boolean(a.agreed),
        version: (a.version ?? null) as string | null,
        source: a.source as string,
        createdAt: a.created_at as string,
      })),
      marketing: (marketingRes.data ?? []).map((m) => ({
        id: m.id as number,
        agreed: Boolean(m.agreed),
        source: m.source as string,
        createdAt: m.created_at as string,
      })),
      mirrorOptIn: Boolean(userRes.data?.marketing_opt_in),
    };
  });
}

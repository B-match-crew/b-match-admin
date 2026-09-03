"use server";

import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { runAction, type ActionResult } from "@/src/shared/lib/action-result";
import { requireAdmin } from "@/src/shared/lib/role-guard";
import type { CategoryReach } from "../model/category-reach";

/**
 * 판정(수신 동의 + 토큰)은 전부 105 안에서 끝난다. 여기서 다시 계산하면
 * 발송이 쓰는 규칙(`fn_enqueue_notification`)과 두 벌이 되어 언젠가 갈린다.
 */
export async function fetchCategoryReach(): Promise<ActionResult<CategoryReach[]>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("fn_admin_category_reach");
    if (error) throw error;

    const rows = (data ?? []) as {
      code: string;
      label: string;
      is_active: boolean;
      is_mandatory: boolean;
      requires_host: boolean;
      default_enabled: boolean;
      storage: string;
      eligible: number;
      enabled_users: number;
      reachable: number;
      reachable_host: number;
      explicit_on: number;
      explicit_off: number;
      by_default: number;
      permission_denied_known: number;
    }[];

    return rows.map((r) => ({
      code: r.code,
      label: r.label,
      isActive: r.is_active,
      isMandatory: r.is_mandatory,
      requiresHost: r.requires_host,
      defaultEnabled: r.default_enabled,
      storage: r.storage,
      eligible: r.eligible,
      enabledUsers: r.enabled_users,
      reachable: r.reachable,
      reachableHost: r.reachable_host,
      explicitOn: r.explicit_on,
      explicitOff: r.explicit_off,
      byDefault: r.by_default,
      permissionDeniedKnown: r.permission_denied_known,
    }));
  });
}

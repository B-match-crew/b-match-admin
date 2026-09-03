"use server";

import type {
  AuditLogRow,
  AuditLogFilter,
} from "../model/actions";

import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { runAction, type ActionResult } from "@/src/shared/lib/action-result";
import { requireAdmin } from "@/src/shared/lib/role-guard";

export async function fetchAuditLogs(
  filter: AuditLogFilter = {}
): Promise<ActionResult<AuditLogRow[]>> {
  return runAction(async () => {
    await requireAdmin("SUPER_ADMIN");
    const supabase = createAdminClient();
    const limit = filter.limit ?? 100;

    let q = supabase
      .from("admin_audit_logs")
      .select(
        `id, admin_id, action_type, target_type, target_id, detail, reason, created_at,
       admin:users!fk_admin_audit_logs_admin(nickname, name)`
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (filter.actionType && filter.actionType !== "ALL") {
      q = q.eq("action_type", filter.actionType);
    }

    if (filter.search && filter.search.trim().length > 0) {
      q = q.ilike("reason", `%${filter.search.trim()}%`);
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as AuditLogRow[];
  });
}

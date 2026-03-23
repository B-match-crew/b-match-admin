import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditLog, AuditAction, AuditTargetType } from "@/src/entities/audit/types";

interface FetchAuditLogsParams {
  actionType?: "all" | AuditAction;
  targetType?: "all" | AuditTargetType;
  page?: number;
  limit?: number;
}

interface FetchAuditLogsResult {
  logs: AuditLog[];
  totalCount: number;
}

export async function fetchAuditLogs(
  supabase: SupabaseClient,
  {
    actionType = "all",
    targetType = "all",
    page = 1,
    limit = 20,
  }: FetchAuditLogsParams
): Promise<FetchAuditLogsResult> {
  let query = supabase
    .from("admin_audit_logs")
    .select(
      "*, admin:users!admin_audit_logs_admin_id_fkey(nickname, real_name)",
      { count: "exact" }
    );

  if (actionType !== "all") {
    query = query.eq("action_type", actionType);
  }

  if (targetType !== "all") {
    query = query.eq("target_type", targetType);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`감사 로그 조회 실패: ${error.message}`);
  }

  const logs: AuditLog[] = (data ?? []).map((item) => {
    const row = item as Record<string, unknown>;
    return {
      ...(row as unknown as AuditLog),
      admin: row.admin as { nickname: string; real_name: string | null } | null,
    };
  });

  return { logs, totalCount: count ?? 0 };
}

export const ACTION_LABELS: Record<AuditAction, string> = {
  BAN_USER: "유저 차단",
  SUSPEND_USER: "유저 정지",
  UNSUSPEND_USER: "유저 정지 해제",
  FORCE_CANCEL_MATCH: "매칭 강제 취소",
  ADJUST_BADTICKET: "배티켓 조정",
  APPROVE_SETTLEMENT: "정산 승인",
  COMPLETE_SETTLEMENT: "정산 완료",
  APPROVE_REFUND: "환불 승인",
  COMPLETE_REFUND: "환불 완료",
  FAIL_SETTLEMENT: "정산 실패",
  FAIL_REFUND: "환불 실패",
  RELEASE_HOLD: "동결 해제",
  DEDUCT_HOLD: "동결금 차감",
  REJECT_REPORT: "신고 반려",
  EXPORT_SETTLEMENTS: "정산 내역 다운로드",
  EXPORT_REFUNDS: "환불 내역 다운로드",
};

export const TARGET_TYPE_LABELS: Record<AuditTargetType, string> = {
  USER: "유저",
  MATCH: "매칭",
  SETTLEMENT: "정산",
  REFUND: "환불",
  REPORT: "신고",
};

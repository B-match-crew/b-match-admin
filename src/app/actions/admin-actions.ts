"use server";

import { createAdminClient } from "@/src/shared/api/supabase-admin";
import type { UserStatus } from "@/src/entities/user/types";
import type { SettlementStatus } from "@/src/entities/settlement/types";
import type { ReportStatus } from "@/src/entities/report/types";
import type { DisputeResolutionType } from "@/src/entities/report/types";

// ─── 헬퍼: auth.users.id → admin_users.id 변환 ───

async function resolveAdminId(
  supabase: ReturnType<typeof createAdminClient>,
  authUserId: string
): Promise<string> {
  const { data } = await supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", authUserId)
    .single();
  if (!data) throw new Error("관리자 계정을 찾을 수 없습니다");
  return data.id;
}

// ─── 유저 관리 ───

export async function adminUpdateUserStatus(
  userId: string,
  newStatus: UserStatus
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("users")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw new Error(`유저 상태 변경 실패: ${error.message}`);
}

export async function adminAdjustBatticket(
  userId: string,
  delta: number,
  reason: string,
  authUserId: string
) {
  const supabase = createAdminClient();
  const adminId = await resolveAdminId(supabase, authUserId);

  const { error } = await supabase.from("badticket_events").insert({
    user_id: userId,
    delta,
    reason: "ADMIN_ADJUST",
    admin_note: reason,
    is_applied: true,
  });

  if (error) throw new Error(`배티켓 조정 실패: ${error.message}`);

  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: "ADJUST_BADTICKET",
    target_type: "USER",
    target_id: userId,
    reason,
  });
}

// ─── 매칭 관리 ───

export async function adminCancelMatch(matchId: string, reason: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("rpc_admin_cancel_match", {
    p_match_id: matchId,
    p_reason: reason,
  });
  if (error) throw new Error(`직권 취소 실패: ${error.message}`);
}

export async function adminDeleteMatching(matchId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("matches")
    .update({
      status: "CANCELED_BY_ADMIN",
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId);
  if (error) throw new Error(`매칭 취소 실패: ${error.message}`);
}

// ─── 커뮤니티 관리 ───

export async function adminBlindPost(
  postId: string,
  authUserId: string,
  reason: string
) {
  const supabase = createAdminClient();
  const adminId = await resolveAdminId(supabase, authUserId);
  const { error } = await supabase
    .from("posts")
    .update({ is_blind: true })
    .eq("id", postId);
  if (error) throw new Error(`게시글 블라인드 실패: ${error.message}`);

  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: "BLIND_POST",
    target_type: "POST",
    target_id: postId,
    reason,
  });
}

export async function adminUnblindPost(postId: string, authUserId: string) {
  const supabase = createAdminClient();
  const adminId = await resolveAdminId(supabase, authUserId);
  const { error } = await supabase
    .from("posts")
    .update({ is_blind: false })
    .eq("id", postId);
  if (error) throw new Error(`게시글 블라인드 해제 실패: ${error.message}`);

  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: "UNBLIND_POST",
    target_type: "POST",
    target_id: postId,
    reason: "블라인드 해제",
  });
}

export async function adminBlindComment(
  commentId: string,
  authUserId: string,
  reason: string
) {
  const supabase = createAdminClient();
  const adminId = await resolveAdminId(supabase, authUserId);
  const { error } = await supabase
    .from("comments")
    .update({ is_blind: true })
    .eq("id", commentId);
  if (error) throw new Error(`댓글 블라인드 실패: ${error.message}`);

  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: "BLIND_COMMENT",
    target_type: "COMMENT",
    target_id: commentId,
    reason,
  });
}

export async function adminUnblindComment(
  commentId: string,
  authUserId: string
) {
  const supabase = createAdminClient();
  const adminId = await resolveAdminId(supabase, authUserId);
  const { error } = await supabase
    .from("comments")
    .update({ is_blind: false })
    .eq("id", commentId);
  if (error) throw new Error(`댓글 블라인드 해제 실패: ${error.message}`);

  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: "UNBLIND_COMMENT",
    target_type: "COMMENT",
    target_id: commentId,
    reason: "블라인드 해제",
  });
}

// ─── 신고/분쟁 관리 ───

export async function adminProcessReport(
  reportId: string,
  result: "경고" | "정지" | "무혐의" | "보류",
  adminNote: string,
  authUserId: string
) {
  const supabase = createAdminClient();
  const adminId = await resolveAdminId(supabase, authUserId);

  const statusMap: Record<string, ReportStatus> = {
    "무혐의": "REJECTED",
    "경고": "RESOLVED",
    "정지": "RESOLVED",
    "보류": "ON_HOLD",
  };

  const { error } = await supabase
    .from("reports")
    .update({ status: statusMap[result] })
    .eq("id", reportId);
  if (error) throw new Error(`신고 처리 실패: ${error.message}`);

  const actionTypeMap: Record<string, string> = {
    "정지": "SUSPEND_USER",
    "경고": "ADJUST_BADTICKET",
    "무혐의": "REJECT_REPORT",
    "보류": "REJECT_REPORT",
  };

  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: actionTypeMap[result],
    target_type: "REPORT",
    target_id: reportId,
    reason: `${result}: ${adminNote}`,
  });
}

export async function adminResolveDispute(params: {
  reportId: string;
  resolutionType: DisputeResolutionType;
  authUserId: string;
  adminNote: string;
  refundAmount?: number;
  paymentId?: string;
  settlementRequestId?: string;
}) {
  const supabase = createAdminClient();
  const {
    reportId,
    resolutionType,
    authUserId,
    adminNote,
    refundAmount,
    paymentId,
    settlementRequestId,
  } = params;
  const adminId = await resolveAdminId(supabase, authUserId);

  switch (resolutionType) {
    case "DISMISS": {
      await supabase
        .from("reports")
        .update({ status: "REJECTED" })
        .eq("id", reportId);
      break;
    }
    case "FULL_REFUND": {
      if (!paymentId) throw new Error("결제 ID가 필요합니다");
      const { data: payment } = await supabase
        .from("payments")
        .select("amount, user_id, match_id")
        .eq("id", paymentId)
        .single();
      if (!payment) throw new Error("결제 정보를 찾을 수 없습니다");

      await supabase
        .from("payments")
        .update({
          status: "REFUNDED",
          refunded_amount: payment.amount,
          refund_reason: "CS_REFUND",
        })
        .eq("id", paymentId);

      await supabase.from("refund_requests").insert({
        guest_id: payment.user_id,
        match_id: payment.match_id,
        payment_id: paymentId,
        amount: payment.amount,
        reason: `분쟁 판정 전액 환불: ${adminNote}`,
        status: "PENDING",
      });

      await supabase
        .from("reports")
        .update({ status: "RESOLVED" })
        .eq("id", reportId);
      break;
    }
    case "PARTIAL_REFUND": {
      if (!paymentId) throw new Error("결제 ID가 필요합니다");
      if (!refundAmount || refundAmount <= 0)
        throw new Error("환불 금액이 필요합니다");

      const { data: payment } = await supabase
        .from("payments")
        .select("amount, user_id, match_id, refunded_amount")
        .eq("id", paymentId)
        .single();
      if (!payment) throw new Error("결제 정보를 찾을 수 없습니다");

      const totalRefunded = (payment.refunded_amount ?? 0) + refundAmount;
      if (totalRefunded > payment.amount)
        throw new Error("환불 금액이 결제 금액을 초과합니다");

      const newStatus =
        totalRefunded === payment.amount ? "REFUNDED" : "REFUND_PENDING";

      await supabase
        .from("payments")
        .update({
          status: newStatus,
          refunded_amount: totalRefunded,
          refund_reason: "CS_REFUND",
        })
        .eq("id", paymentId);

      await supabase.from("refund_requests").insert({
        guest_id: payment.user_id,
        match_id: payment.match_id,
        payment_id: paymentId,
        amount: refundAmount,
        reason: `분쟁 판정 부분 환불: ${adminNote}`,
        status: "PENDING",
      });

      await supabase
        .from("reports")
        .update({ status: "RESOLVED" })
        .eq("id", reportId);
      break;
    }
    case "WITHDRAW_INTERCEPT": {
      if (!settlementRequestId)
        throw new Error("정산 요청 ID가 필요합니다");
      await supabase
        .from("settlement_requests")
        .update({ status: "FAILED" })
        .eq("id", settlementRequestId);
      await supabase
        .from("reports")
        .update({ status: "RESOLVED" })
        .eq("id", reportId);
      break;
    }
    case "TRANSFER_EXEMPT": {
      await supabase
        .from("reports")
        .update({ status: "RESOLVED" })
        .eq("id", reportId);
      break;
    }
  }

  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: "REJECT_REPORT",
    target_type: "REPORT",
    target_id: reportId,
    reason: adminNote,
    snapshot: {
      resolution_type: resolutionType,
      refund_amount: refundAmount,
      payment_id: paymentId,
      settlement_request_id: settlementRequestId,
    },
  });
}

// ─── 정산 관리 (settlement-management) ───

export async function adminMarkSettlementsExported(
  ids: string[],
  authUserId: string
) {
  const supabase = createAdminClient();
  const adminId = await resolveAdminId(supabase, authUserId);
  const { error } = await supabase
    .from("settlement_requests")
    .update({ status: "EXPORTED" })
    .in("id", ids)
    .eq("status", "PENDING");
  if (error) throw new Error(`정산 내보내기 실패: ${error.message}`);

  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: "EXPORT_SETTLEMENTS",
    target_type: "SETTLEMENT",
    target_id: ids[0],
    reason: `${ids.length}건 정산 내보내기`,
  });
}

export async function adminCompleteSettlement(
  id: string,
  authUserId: string
) {
  const supabase = createAdminClient();
  const adminId = await resolveAdminId(supabase, authUserId);
  const { data: current } = await supabase
    .from("settlement_requests")
    .select("status")
    .eq("id", id)
    .single();

  if (!current) throw new Error("정산 요청을 찾을 수 없습니다");
  if (current.status === "COMPLETED")
    throw new Error("이미 완료된 정산입니다 (이중 송금 방어)");
  if (current.status !== "EXPORTED")
    throw new Error("EXPORTED 상태만 완료 처리할 수 있습니다");

  const { error } = await supabase
    .from("settlement_requests")
    .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "EXPORTED");
  if (error) throw new Error(`정산 완료 처리 실패: ${error.message}`);

  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: "COMPLETE_SETTLEMENT",
    target_type: "SETTLEMENT",
    target_id: id,
    reason: "정산 완료 처리",
  });
}

export async function adminFailSettlement(
  id: string,
  authUserId: string,
  reason: string
) {
  const supabase = createAdminClient();
  const adminId = await resolveAdminId(supabase, authUserId);
  const { error } = await supabase
    .from("settlement_requests")
    .update({ status: "FAILED" })
    .eq("id", id);
  if (error) throw new Error(`정산 실패 처리 실패: ${error.message}`);

  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: "FAIL_SETTLEMENT",
    target_type: "SETTLEMENT",
    target_id: id,
    reason,
  });
}

export async function adminMarkRefundsExported(
  ids: string[],
  authUserId: string
) {
  const supabase = createAdminClient();
  const adminId = await resolveAdminId(supabase, authUserId);
  const { error } = await supabase
    .from("refund_requests")
    .update({ status: "EXPORTED" })
    .in("id", ids)
    .eq("status", "PENDING");
  if (error) throw new Error(`환불 내보내기 실패: ${error.message}`);

  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: "EXPORT_REFUNDS",
    target_type: "REFUND",
    target_id: ids[0],
    reason: `${ids.length}건 환불 내보내기`,
  });
}

export async function adminCompleteRefund(id: string, authUserId: string) {
  const supabase = createAdminClient();
  const adminId = await resolveAdminId(supabase, authUserId);
  const { data: current } = await supabase
    .from("refund_requests")
    .select("status")
    .eq("id", id)
    .single();

  if (!current) throw new Error("환불 요청을 찾을 수 없습니다");
  if (current.status === "COMPLETED")
    throw new Error("이미 완료된 환불입니다 (이중 송금 방어)");
  if (current.status !== "EXPORTED")
    throw new Error("EXPORTED 상태만 완료 처리할 수 있습니다");

  const { error } = await supabase
    .from("refund_requests")
    .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "EXPORTED");
  if (error) throw new Error(`환불 완료 처리 실패: ${error.message}`);

  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: "COMPLETE_REFUND",
    target_type: "REFUND",
    target_id: id,
    reason: "환불 완료 처리",
  });
}

export async function adminFailRefund(
  id: string,
  authUserId: string,
  reason: string
) {
  const supabase = createAdminClient();
  const adminId = await resolveAdminId(supabase, authUserId);
  const { error } = await supabase
    .from("refund_requests")
    .update({ status: "FAILED" })
    .eq("id", id);
  if (error) throw new Error(`환불 실패 처리 실패: ${error.message}`);

  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: "FAIL_REFUND",
    target_type: "REFUND",
    target_id: id,
    reason,
  });
}

// ─── 정산 관리 (settlement - 레거시) ───

export async function adminUpdateSettlementStatus(
  ids: string[],
  newStatus: SettlementStatus,
  authUserId: string,
  reason?: string
) {
  const supabase = createAdminClient();
  const adminId = await resolveAdminId(supabase, authUserId);
  const updateData: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };
  if (newStatus === "COMPLETED") {
    updateData.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("settlement_requests")
    .update(updateData)
    .in("id", ids);
  if (error) throw new Error(`정산 상태 변경 실패: ${error.message}`);

  const actionType =
    newStatus === "COMPLETED"
      ? "APPROVE_SETTLEMENT"
      : newStatus === "FAILED"
        ? "FAIL_SETTLEMENT"
        : "APPROVE_SETTLEMENT";

  for (const id of ids) {
    await supabase.from("admin_audit_logs").insert({
      admin_id: adminId,
      action_type: actionType,
      target_type: "SETTLEMENT",
      target_id: id,
      reason: reason ?? `상태 변경: ${newStatus}`,
    });
  }
}

export async function adminRetryRefund(refundId: string, authUserId: string) {
  const supabase = createAdminClient();
  const adminId = await resolveAdminId(supabase, authUserId);
  const { error } = await supabase
    .from("refund_requests")
    .update({ status: "PENDING", updated_at: new Date().toISOString() })
    .eq("id", refundId);
  if (error) throw new Error(`환불 재시도 실패: ${error.message}`);

  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: "APPROVE_REFUND",
    target_type: "REFUND",
    target_id: refundId,
    reason: "PG 환불 재시도",
  });
}

// ─── 푸시 알림 ───

export async function adminSendPush(payload: {
  title: string;
  body: string;
  target: string;
  targetIds?: string[];
  scheduledAt?: string | null;
  sentBy?: string | null;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("push_notifications")
    .insert({
      title: payload.title,
      body: payload.body,
      target: payload.target,
      target_ids: payload.targetIds ?? null,
      scheduled_at: payload.scheduledAt ?? null,
      status: payload.scheduledAt ? "PENDING" : "SENT",
      sent_at: payload.scheduledAt ? null : new Date().toISOString(),
      sent_by: payload.sentBy ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`푸시 발송 실패: ${error.message}`);
  return data;
}

// ─── 대시보드 읽기 (RLS 우회) ───

export async function adminFetchRiskAlerts() {
  const supabase = createAdminClient();
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const [pendingReports, failedRefunds, delayedSettlements] =
    await Promise.all([
      supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "PENDING"),
      supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("status", "REFUND_FAILED"),
      supabase
        .from("settlement_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "PENDING")
        .lte("created_at", threeDaysAgo.toISOString()),
    ]);

  return {
    pendingReports: pendingReports.count ?? 0,
    failedRefunds: failedRefunds.count ?? 0,
    delayedSettlements: delayedSettlements.count ?? 0,
  };
}

export async function adminFetchFinanceHealth() {
  const supabase = createAdminClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [pgFeesRes, refundLossesRes, pendingEscrowRes] = await Promise.all([
    supabase
      .from("payments")
      .select("pg_fee")
      .eq("status", "PAID")
      .gte("created_at", monthStart.toISOString()),
    supabase
      .from("payments")
      .select("amount")
      .eq("status", "REFUNDED")
      .gte("created_at", monthStart.toISOString()),
    supabase.from("host_wallets").select("pending_balance"),
  ]);

  const monthlyPgFees = (pgFeesRes.data ?? []).reduce(
    (sum, row) => sum + (row.pg_fee ?? 0),
    0
  );
  const refundLosses = (refundLossesRes.data ?? []).reduce(
    (sum, row) => sum + (row.amount ?? 0),
    0
  );
  const pendingEscrow = (pendingEscrowRes.data ?? []).reduce(
    (sum, row) => sum + (row.pending_balance ?? 0),
    0
  );

  return { monthlyPgFees, refundLosses, pendingEscrow };
}

export async function adminFetchActiveMatches() {
  const supabase = createAdminClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [todayMatches, recruitingMatches] = await Promise.all([
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .gte("start_time", todayStart.toISOString())
      .lte("start_time", todayEnd.toISOString())
      .in("status", ["RECRUITING", "CLOSED", "IN_PROGRESS"]),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("status", "RECRUITING"),
  ]);

  return {
    todayMatches: todayMatches.count ?? 0,
    recruitingMatches: recruitingMatches.count ?? 0,
  };
}

export async function adminFetchRecentActivity() {
  const supabase = createAdminClient();
  const [usersRes, reportsRes] = await Promise.all([
    supabase
      .from("users")
      .select("id, nickname, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("reports")
      .select("id, reason, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const userItems = (usersRes.data ?? []).map((u) => ({
    id: u.id as string,
    type: "user" as const,
    label: `${u.nickname} 님이 가입했습니다`,
    status: "신규 가입",
    created_at: u.created_at as string,
  }));

  const reportItems = (reportsRes.data ?? []).map((r) => ({
    id: r.id as string,
    type: "report" as const,
    label: r.reason as string,
    status: r.status as string,
    created_at: r.created_at as string,
  }));

  return [...userItems, ...reportItems]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 10);
}

export async function adminFetchRecentReports() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("reports")
    .select(
      "id, reason, status, created_at, reporter:users!reports_reporter_id_fkey(nickname)"
    )
    .order("created_at", { ascending: false })
    .limit(5);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    reason: row.reason as string,
    status: row.status as string,
    created_at: row.created_at as string,
    reporter: row.reporter as { nickname: string }[] | null,
  }));
}

// ─── 시스템 설정 ───

export async function adminUpdateAppConfig(key: string, value: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("app_config")
    .update({ value, updated_at: new Date().toISOString() })
    .eq("key", key);
  if (error) throw new Error(`설정 변경 실패: ${error.message}`);
}

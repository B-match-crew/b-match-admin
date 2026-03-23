import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Report,
  ReportStatus,
  DisputeResolutionType,
  PastReportRecord,
} from "@/src/entities/report/types";

interface FetchReportsParams {
  status?: "all" | ReportStatus;
  page?: number;
  limit?: number;
}

interface FetchReportsResult {
  reports: Report[];
  totalCount: number;
}

export async function fetchReports(
  supabase: SupabaseClient,
  { status = "all", page = 1, limit = 20 }: FetchReportsParams
): Promise<FetchReportsResult> {
  let query = supabase
    .from("reports")
    .select(
      "*, reporter:users!reports_reporter_id_fkey(nickname, real_name)",
      { count: "exact" }
    );

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`신고 목록 조회 실패: ${error.message}`);
  }

  const reports: Report[] = (data ?? []).map((item) => {
    const row = item as Record<string, unknown>;
    const reporter = row.reporter as { nickname: string; real_name: string | null } | null;
    return {
      ...(row as unknown as Report),
      reporter,
      reporter_nickname: reporter?.nickname,
      target_label: buildTargetLabel(
        row.target_type as string,
        row.target_id as string
      ),
    };
  });

  return {
    reports,
    totalCount: count ?? 0,
  };
}

export interface ReportDetail {
  report: Report;
  reporterInfo: { nickname: string; real_name: string | null } | null;
  targetContent: string | null;
}

export async function fetchReportById(
  supabase: SupabaseClient,
  reportId: string
): Promise<ReportDetail> {
  const { data, error } = await supabase
    .from("reports")
    .select(
      "*, reporter:users!reports_reporter_id_fkey(id, nickname, real_name)"
    )
    .eq("id", reportId)
    .single();

  if (error) {
    throw new Error(`신고 조회 실패: ${error.message}`);
  }

  const row = data as Record<string, unknown>;
  const targetType = row.target_type as string;
  const targetId = row.target_id as string;

  let targetContent: string | null = null;

  if (targetType === "POST") {
    const { data: post } = await supabase
      .from("posts")
      .select("title, content")
      .eq("id", targetId)
      .single();
    if (post) {
      targetContent = `${post.title}\n${post.content}`;
    }
  } else if (targetType === "COMMENT") {
    const { data: comment } = await supabase
      .from("comments")
      .select("content")
      .eq("id", targetId)
      .single();
    if (comment) {
      targetContent = comment.content;
    }
  } else if (targetType === "MATCH") {
    const { data: match } = await supabase
      .from("matches")
      .select("title, status")
      .eq("id", targetId)
      .single();
    if (match) {
      targetContent = `${match.title} (상태: ${match.status})`;
    }
  } else if (targetType === "HOST_NOSHOW") {
    const { data: match } = await supabase
      .from("matches")
      .select("title")
      .eq("id", targetId)
      .single();
    if (match) {
      targetContent = `호스트 노쇼: ${match.title}`;
    }
  }

  const reporter = row.reporter as { nickname: string; real_name: string | null } | null;

  const report: Report = {
    ...(row as unknown as Report),
    reporter,
    reporter_nickname: reporter?.nickname,
    target_label: buildTargetLabel(targetType, targetId),
  };

  return {
    report,
    reporterInfo: reporter,
    targetContent,
  };
}

/**
 * 피신고자(target_user_id)의 과거 신고 이력 조회
 */
export async function fetchPastReports(
  supabase: SupabaseClient,
  targetUserId: string,
  excludeReportId?: string
): Promise<PastReportRecord[]> {
  let query = supabase
    .from("reports")
    .select("id, target_type, reason, status, created_at")
    .eq("target_user_id", targetUserId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (excludeReportId) {
    query = query.neq("id", excludeReportId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`과거 신고 이력 조회 실패: ${error.message}`);
  }

  return (data ?? []) as PastReportRecord[];
}

export type ReportActionType = "경고" | "정지" | "무혐의" | "보류";

export async function processReport(
  supabase: SupabaseClient,
  reportId: string,
  result: ReportActionType,
  adminNote: string,
  adminId: string
): Promise<void> {
  const statusMap: Record<ReportActionType, ReportStatus> = {
    "무혐의": "REJECTED",
    "경고": "RESOLVED",
    "정지": "RESOLVED",
    "보류": "ON_HOLD",
  };

  const newStatus = statusMap[result];

  const { error } = await supabase
    .from("reports")
    .update({ status: newStatus })
    .eq("id", reportId);

  if (error) {
    throw new Error(`신고 처리 실패: ${error.message}`);
  }

  // 감사 로그 기록
  const actionTypeMap: Record<ReportActionType, string> = {
    "정지": "SUSPEND_USER",
    "경고": "ADJUST_BADTICKET",
    "무혐의": "REJECT_REPORT",
    "보류": "REJECT_REPORT",
  };

  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: actionTypeMap[result],
    target_type: "USER",
    target_id: reportId,
    reason: `${result}: ${adminNote}`,
  });
}

/**
 * 분쟁 판정 5종 트랜잭션
 */
export interface DisputeResolutionParams {
  reportId: string;
  resolutionType: DisputeResolutionType;
  adminId: string;
  adminNote: string;
  /** 부분 환불 시 환불 금액 */
  refundAmount?: number;
  /** 관련 결제 ID */
  paymentId?: string;
  /** 관련 정산 요청 ID */
  settlementRequestId?: string;
}

export async function resolveDispute(
  supabase: SupabaseClient,
  params: DisputeResolutionParams
): Promise<void> {
  const {
    reportId,
    resolutionType,
    adminId,
    adminNote,
    refundAmount,
    paymentId,
    settlementRequestId,
  } = params;

  switch (resolutionType) {
    case "DISMISS": {
      // 무혐의 반려: 신고 상태만 REJECTED로 변경
      await supabase
        .from("reports")
        .update({ status: "REJECTED" })
        .eq("id", reportId);
      break;
    }

    case "FULL_REFUND": {
      // 전액 환불: 결제 상태 REFUNDED + 환불 요청 생성
      if (!paymentId) throw new Error("결제 ID가 필요합니다");

      const { data: payment } = await supabase
        .from("payments")
        .select("amount, guest_id, match_id")
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
        guest_id: payment.guest_id,
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
      // 개별/부분 환불
      if (!paymentId) throw new Error("결제 ID가 필요합니다");
      if (!refundAmount || refundAmount <= 0) throw new Error("환불 금액이 필요합니다");

      const { data: payment } = await supabase
        .from("payments")
        .select("amount, guest_id, match_id, refunded_amount")
        .eq("id", paymentId)
        .single();

      if (!payment) throw new Error("결제 정보를 찾을 수 없습니다");

      const totalRefunded = (payment.refunded_amount ?? 0) + refundAmount;
      if (totalRefunded > payment.amount) {
        throw new Error("환불 금액이 결제 금액을 초과합니다");
      }

      const newStatus = totalRefunded === payment.amount ? "REFUNDED" : "REFUND_PENDING";

      await supabase
        .from("payments")
        .update({
          status: newStatus,
          refunded_amount: totalRefunded,
          refund_reason: "CS_REFUND",
        })
        .eq("id", paymentId);

      await supabase.from("refund_requests").insert({
        guest_id: payment.guest_id,
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
      // 출금 인터셉트: 관련 정산 요청을 FAILED로 변경 + 지갑 동결
      if (!settlementRequestId) throw new Error("정산 요청 ID가 필요합니다");

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
      // 송금 완료 면책: 이미 송금된 건에 대해 면책 처리
      await supabase
        .from("reports")
        .update({ status: "RESOLVED" })
        .eq("id", reportId);
      break;
    }
  }

  // 감사 로그 기록
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

function buildTargetLabel(targetType: string, targetId: string): string {
  const typeLabels: Record<string, string> = {
    POST: "게시글",
    COMMENT: "댓글",
    MATCH: "매칭",
    HOST_NOSHOW: "호스트 노쇼",
  };
  return `${typeLabels[targetType] ?? targetType} #${targetId}`;
}

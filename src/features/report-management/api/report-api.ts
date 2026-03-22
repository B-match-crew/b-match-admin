import type { SupabaseClient } from "@supabase/supabase-js";
import type { Report, ReportStatus } from "@/src/entities/report/types";

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
        row.target_id as number
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
  reportId: number
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
  const targetId = row.target_id as number;

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

export async function processReport(
  supabase: SupabaseClient,
  reportId: number,
  result: "경고" | "정지" | "무혐의",
  adminNote: string,
  adminId: string
): Promise<void> {
  // v3.0: reports 테이블에는 status만 PENDING/RESOLVED/REJECTED
  const newStatus: ReportStatus = result === "무혐의" ? "REJECTED" : "RESOLVED";

  const { error } = await supabase
    .from("reports")
    .update({ status: newStatus })
    .eq("id", reportId);

  if (error) {
    throw new Error(`신고 처리 실패: ${error.message}`);
  }

  // 감사 로그 기록
  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: result === "정지" ? "SUSPEND_USER" : "ADJUST_BADTICKET",
    target_type: "USER",
    target_id: reportId,
    reason: `${result}: ${adminNote}`,
  });
}

function buildTargetLabel(targetType: string, targetId: number): string {
  const typeLabels: Record<string, string> = {
    POST: "게시글",
    COMMENT: "댓글",
    MATCH: "매칭",
    HOST_NOSHOW: "호스트 노쇼",
  };
  return `${typeLabels[targetType] ?? targetType} #${targetId}`;
}

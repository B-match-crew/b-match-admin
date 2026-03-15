import type { SupabaseClient } from "@supabase/supabase-js";
import type { Report } from "@/src/entities/report/types";

interface FetchReportsParams {
  status?: "all" | "처리 대기" | "경고" | "정지" | "무혐의";
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
      `
      *,
      reporter:users!reports_reporter_id_fkey(nickname)
    `,
      { count: "exact" }
    );

  // 상태 필터
  if (status !== "all") {
    query = query.eq("status", status);
  }

  // 페이지네이션
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`신고 목록 조회 실패: ${error.message}`);
  }

  const reports: Report[] = (data ?? []).map((item) => {
    const row = item as Record<string, unknown>;
    return {
      ...(row as unknown as Report),
      reporter_nickname: (row.reporter as { nickname: string } | null)?.nickname,
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
  reporterInfo: Record<string, unknown> | null;
  targetContent: string | null;
}

export async function fetchReportById(
  supabase: SupabaseClient,
  reportId: string
): Promise<ReportDetail> {
  const { data, error } = await supabase
    .from("reports")
    .select(
      `
      *,
      reporter:users!reports_reporter_id_fkey(id, nickname, real_name, profile_image_url)
    `
    )
    .eq("id", reportId)
    .single();

  if (error) {
    throw new Error(`신고 조회 실패: ${error.message}`);
  }

  const row = data as Record<string, unknown>;
  const targetType = row.target_type as string;
  const targetId = row.target_id as string;

  // 신고 대상 콘텐츠 조회
  let targetContent: string | null = null;

  if (targetType === "게시글") {
    const { data: post } = await supabase
      .from("community_posts")
      .select("title, content")
      .eq("id", targetId)
      .single();
    if (post) {
      targetContent = `${post.title}\n${post.content}`;
    }
  } else if (targetType === "댓글") {
    const { data: comment } = await supabase
      .from("comments")
      .select("content")
      .eq("id", targetId)
      .single();
    if (comment) {
      targetContent = comment.content;
    }
  } else if (targetType === "사용자") {
    const { data: user } = await supabase
      .from("users")
      .select("nickname, battiket_score, is_active")
      .eq("id", targetId)
      .single();
    if (user) {
      targetContent = `${user.nickname} (배티켓: ${user.battiket_score}, 상태: ${user.is_active ? "정상" : "정지"})`;
    }
  }

  const report: Report = {
    ...(row as unknown as Report),
    reporter_nickname: (row.reporter as { nickname: string } | null)?.nickname,
    target_label: buildTargetLabel(targetType, targetId),
  };

  return {
    report,
    reporterInfo: row.reporter as Record<string, unknown> | null,
    targetContent,
  };
}

export async function processReport(
  supabase: SupabaseClient,
  reportId: string,
  result: "경고" | "정지" | "무혐의",
  adminNote: string,
  adminId: string
): Promise<void> {
  const { error } = await supabase
    .from("reports")
    .update({
      status: result,
      admin_note: adminNote,
      processed_at: new Date().toISOString(),
      processed_by: adminId,
    })
    .eq("id", reportId);

  if (error) {
    throw new Error(`신고 처리 실패: ${error.message}`);
  }

  // 정지 처리 + 사용자 신고인 경우 유저 비활성화
  if (result === "정지") {
    const { data: report } = await supabase
      .from("reports")
      .select("target_type, target_id")
      .eq("id", reportId)
      .single();

    if (report && report.target_type === "사용자") {
      await supabase
        .from("users")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", report.target_id);
    }
  }
}

function buildTargetLabel(targetType: string, targetId: string): string {
  const shortId = targetId?.slice(0, 8) ?? "";
  return `${targetType} (${shortId}...)`;
}

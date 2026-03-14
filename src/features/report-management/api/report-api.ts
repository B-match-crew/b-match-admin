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
      reporter:users!reports_reporter_id_fkey(nickname),
      reported:users!reports_reported_id_fkey(nickname)
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

  // 조인 데이터 매핑
  const reports: Report[] = (data ?? []).map((item) => {
    const row = item as Record<string, unknown>;
    return {
      ...(row as unknown as Report),
      reporter_nickname: (row.reporter as { nickname: string } | null)?.nickname,
      reported_nickname: (row.reported as { nickname: string } | null)?.nickname,
    };
  });

  return {
    reports,
    totalCount: count ?? 0,
  };
}

export async function fetchReportById(
  supabase: SupabaseClient,
  reportId: string
): Promise<Report> {
  const { data, error } = await supabase
    .from("reports")
    .select(
      `
      *,
      reporter:users!reports_reporter_id_fkey(nickname, real_name, profile_image_url),
      reported:users!reports_reported_id_fkey(nickname, real_name, profile_image_url, battiket_score, is_active)
    `
    )
    .eq("id", reportId)
    .single();

  if (error) {
    throw new Error(`신고 조회 실패: ${error.message}`);
  }

  const row = data as Record<string, unknown>;
  return {
    ...(row as unknown as Report),
    reporter_nickname: (row.reporter as { nickname: string } | null)?.nickname,
    reported_nickname: (row.reported as { nickname: string } | null)?.nickname,
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

  // 정지 처리인 경우 유저 비활성화
  if (result === "정지") {
    const { data: report } = await supabase
      .from("reports")
      .select("reported_id")
      .eq("id", reportId)
      .single();

    if (report) {
      await supabase
        .from("users")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", report.reported_id);
    }
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { requireAdmin } from "@/src/shared/lib/role-guard";
import {
  rpcSuspendUser,
  rpcBanUser,
  rpcUnblindPost,
} from "@/src/shared/api/rpc";
import { REASON_MIN_LENGTH } from "@/src/shared/config/constants";
import type { DbReport, DbPost, DbComment, DbUser } from "@/src/shared/types/db";

// ─── 조회 ───

export interface ReportRow extends DbReport {
  reporter: Pick<DbUser, "nickname" | "name"> | null;
  /** 동일 대상에 누적된 PENDING 신고 수 */
  cumulative_count: number;
}

export async function fetchPendingReports(): Promise<ReportRow[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("reports")
    .select(
      `id, reporter_id, target_type, target_id, status, created_at,
       reporter:users!reports_reporter_id_fkey(nickname, name)`
    )
    .eq("status", "PENDING")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<
    DbReport & { reporter: { nickname: string | null; name: string | null } | null }
  >;

  // 동일 대상에 대한 전체 신고 수 서버 집계
  const targets = [...new Set(rows.map((r) => `${r.target_type}:${r.target_id}`))];
  const countMap = new Map<string, number>();

  if (targets.length > 0) {
    const postIds = rows.filter((r) => r.target_type === "POST").map((r) => r.target_id);
    const commentIds = rows.filter((r) => r.target_type === "COMMENT").map((r) => r.target_id);

    const [postCounts, commentCounts] = await Promise.all([
      postIds.length > 0
        ? supabase
            .from("reports")
            .select("target_id")
            .eq("target_type", "POST")
            .in("target_id", [...new Set(postIds)])
        : Promise.resolve({ data: [] }),
      commentIds.length > 0
        ? supabase
            .from("reports")
            .select("target_id")
            .eq("target_type", "COMMENT")
            .in("target_id", [...new Set(commentIds)])
        : Promise.resolve({ data: [] }),
    ]);

    for (const r of postCounts.data ?? []) {
      const key = `POST:${r.target_id}`;
      countMap.set(key, (countMap.get(key) ?? 0) + 1);
    }
    for (const r of commentCounts.data ?? []) {
      const key = `COMMENT:${r.target_id}`;
      countMap.set(key, (countMap.get(key) ?? 0) + 1);
    }
  }

  return rows.map((r) => ({
    ...r,
    cumulative_count: countMap.get(`${r.target_type}:${r.target_id}`) ?? 1,
  }));
}

export interface ReportHistoryParams {
  status?: "RESOLVED" | "REJECTED" | "ALL";
  limit?: number;
  offset?: number;
}

export async function fetchReportHistory(
  params: ReportHistoryParams = {}
): Promise<{ rows: ReportRow[]; total: number }> {
  await requireAdmin();
  const supabase = createAdminClient();
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  const statusFilter = params.status ?? "ALL";

  let q = supabase
    .from("reports")
    .select(
      `id, reporter_id, target_type, target_id, status, created_at,
       reporter:users!reports_reporter_id_fkey(nickname, name)`,
      { count: "exact" }
    )
    .in("status", statusFilter === "ALL" ? ["RESOLVED", "REJECTED"] : [statusFilter])
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await q;
  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<
    DbReport & { reporter: { nickname: string | null; name: string | null } | null }
  >;

  return {
    rows: rows.map((r) => ({ ...r, cumulative_count: 0 })),
    total: count ?? 0,
  };
}

export interface ReportTargetContent {
  type: "POST" | "COMMENT";
  post?: DbPost & { author: Pick<DbUser, "id" | "nickname" | "name"> | null };
  comment?: DbComment & { author: Pick<DbUser, "id" | "nickname" | "name"> | null };
}

export async function fetchReportTarget(
  targetType: "POST" | "COMMENT",
  targetId: number
): Promise<ReportTargetContent> {
  await requireAdmin();
  const supabase = createAdminClient();

  if (targetType === "POST") {
    const { data, error } = await supabase
      .from("posts")
      .select("*, author:users!posts_author_id_fkey(id, nickname, name)")
      .eq("id", targetId)
      .single();
    if (error) throw error;
    return { type: "POST", post: data as ReportTargetContent["post"] };
  } else {
    const { data, error } = await supabase
      .from("comments")
      .select("*, author:users!comments_author_id_fkey(id, nickname, name)")
      .eq("id", targetId)
      .single();
    if (error) throw error;
    return { type: "COMMENT", comment: data as ReportTargetContent["comment"] };
  }
}

// ─── 액션 ───

export async function rejectReport(reportId: number) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("reports")
    .update({ status: "REJECTED" })
    .eq("id", reportId);
  if (error) throw error;
  revalidatePath("/reports");
}

export async function suspendReportedUser(p: {
  userId: string;
  until: string; // ISO
  reason: string;
  reportId: number;
}) {
  if (p.reason.trim().length < REASON_MIN_LENGTH) {
    throw new Error(`사유는 ${REASON_MIN_LENGTH}자 이상 입력해야 합니다`);
  }
  await requireAdmin("MANAGER");
  await rpcSuspendUser({ userId: p.userId, until: p.until, reason: p.reason });

  // 신고 RESOLVED 처리
  const supabase = createAdminClient();
  await supabase
    .from("reports")
    .update({ status: "RESOLVED" })
    .eq("id", p.reportId);
  revalidatePath("/reports");
}

export async function banReportedUser(p: {
  userId: string;
  reason: string;
  reportId: number;
}) {
  if (p.reason.trim().length < REASON_MIN_LENGTH) {
    throw new Error(`사유는 ${REASON_MIN_LENGTH}자 이상 입력해야 합니다`);
  }
  await requireAdmin("SUPER_ADMIN");
  await rpcBanUser({ userId: p.userId, reason: p.reason });

  const supabase = createAdminClient();
  await supabase
    .from("reports")
    .update({ status: "RESOLVED" })
    .eq("id", p.reportId);
  revalidatePath("/reports");
}

export async function unblindReportedPost(p: {
  postId: number;
  reason: string;
}) {
  if (p.reason.trim().length < REASON_MIN_LENGTH) {
    throw new Error(`사유는 ${REASON_MIN_LENGTH}자 이상 입력해야 합니다`);
  }
  await requireAdmin("MANAGER");
  await rpcUnblindPost({ postId: p.postId, reason: p.reason });
  revalidatePath("/reports");
}

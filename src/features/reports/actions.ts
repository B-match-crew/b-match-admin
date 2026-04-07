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

  // 누적 카운트 집계 (target_type + target_id)
  const rows = (data ?? []) as unknown as Array<
    DbReport & { reporter: { nickname: string | null; name: string | null } | null }
  >;
  const keyOf = (r: { target_type: string; target_id: number }) =>
    `${r.target_type}:${r.target_id}`;
  const counts = new Map<string, number>();
  for (const r of rows) {
    counts.set(keyOf(r), (counts.get(keyOf(r)) ?? 0) + 1);
  }

  return rows.map((r) => ({
    ...r,
    cumulative_count: counts.get(keyOf(r)) ?? 1,
  }));
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

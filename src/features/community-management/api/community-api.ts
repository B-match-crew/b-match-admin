import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CommunityPost,
  CommunityComment,
} from "@/src/entities/community/types";

export type BlindFilter = "all" | "visible" | "blinded" | "deleted";

interface FetchPostsParams {
  blindFilter?: BlindFilter;
  page?: number;
  limit?: number;
}

interface FetchPostsResult {
  posts: CommunityPost[];
  totalCount: number;
}

export async function fetchCommunityPosts(
  supabase: SupabaseClient,
  { blindFilter = "all", page = 1, limit = 20 }: FetchPostsParams
): Promise<FetchPostsResult> {
  let query = supabase
    .from("posts")
    .select(
      "id, author_id, title, content, is_blind, is_deleted, created_at, updated_at, author:users!posts_author_id_fkey(nickname, real_name), reports(count)",
      { count: "exact" }
    );

  if (blindFilter === "visible") {
    query = query.eq("is_blind", false).eq("is_deleted", false);
  } else if (blindFilter === "blinded") {
    query = query.eq("is_blind", true);
  } else if (blindFilter === "deleted") {
    query = query.eq("is_deleted", true);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`게시글 목록 조회 실패: ${error.message}`);
  }

  // reports(count) 결과를 report_count로 매핑
  const posts = (data ?? []).map((row: Record<string, unknown>) => {
    const reports = row.reports as { count: number }[] | undefined;
    const { reports: _reports, ...rest } = row;
    return {
      ...rest,
      report_count: reports?.[0]?.count ?? 0,
    };
  }) as unknown as CommunityPost[];

  return {
    posts,
    totalCount: count ?? 0,
  };
}

interface FetchCommentsParams {
  blindFilter?: BlindFilter;
  page?: number;
  limit?: number;
}

interface FetchCommentsResult {
  comments: CommunityComment[];
  totalCount: number;
}

export async function fetchCommunityComments(
  supabase: SupabaseClient,
  { blindFilter = "all", page = 1, limit = 20 }: FetchCommentsParams
): Promise<FetchCommentsResult> {
  let query = supabase
    .from("comments")
    .select(
      "id, post_id, author_id, content, is_blind, is_deleted, created_at, author:users!comments_author_id_fkey(nickname, real_name), reports(count)",
      { count: "exact" }
    );

  if (blindFilter === "visible") {
    query = query.eq("is_blind", false).eq("is_deleted", false);
  } else if (blindFilter === "blinded") {
    query = query.eq("is_blind", true);
  } else if (blindFilter === "deleted") {
    query = query.eq("is_deleted", true);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`댓글 목록 조회 실패: ${error.message}`);
  }

  const comments = (data ?? []).map((row: Record<string, unknown>) => {
    const reports = row.reports as { count: number }[] | undefined;
    const { reports: _reports, ...rest } = row;
    return {
      ...rest,
      report_count: reports?.[0]?.count ?? 0,
    };
  }) as unknown as CommunityComment[];

  return {
    comments,
    totalCount: count ?? 0,
  };
}

/**
 * 게시글 블라인드 처리
 */
export async function blindPost(
  supabase: SupabaseClient,
  postId: number,
  adminId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from("posts")
    .update({ is_blind: true })
    .eq("id", postId);

  if (error) {
    throw new Error(`게시글 블라인드 실패: ${error.message}`);
  }

  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: "BLIND_POST",
    target_type: "POST",
    target_id: postId,
    reason,
  });
}

/**
 * 게시글 블라인드 해제
 */
export async function unblindPost(
  supabase: SupabaseClient,
  postId: number,
  adminId: string
): Promise<void> {
  const { error } = await supabase
    .from("posts")
    .update({ is_blind: false })
    .eq("id", postId);

  if (error) {
    throw new Error(`게시글 블라인드 해제 실패: ${error.message}`);
  }

  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: "UNBLIND_POST",
    target_type: "POST",
    target_id: postId,
    reason: "블라인드 해제",
  });
}

/**
 * 댓글 블라인드 처리
 */
export async function blindComment(
  supabase: SupabaseClient,
  commentId: number,
  adminId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from("comments")
    .update({ is_blind: true })
    .eq("id", commentId);

  if (error) {
    throw new Error(`댓글 블라인드 실패: ${error.message}`);
  }

  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: "BLIND_COMMENT",
    target_type: "COMMENT",
    target_id: commentId,
    reason,
  });
}

/**
 * 댓글 블라인드 해제
 */
export async function unblindComment(
  supabase: SupabaseClient,
  commentId: number,
  adminId: string
): Promise<void> {
  const { error } = await supabase
    .from("comments")
    .update({ is_blind: false })
    .eq("id", commentId);

  if (error) {
    throw new Error(`댓글 블라인드 해제 실패: ${error.message}`);
  }

  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: "UNBLIND_COMMENT",
    target_type: "COMMENT",
    target_id: commentId,
    reason: "블라인드 해제",
  });
}

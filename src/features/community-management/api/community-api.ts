import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CommunityPost,
  CommunityComment,
  BlindStatus,
} from "@/src/entities/community/types";

interface FetchPostsParams {
  blindStatus?: "all" | BlindStatus;
  page?: number;
  limit?: number;
}

interface FetchPostsResult {
  posts: CommunityPost[];
  totalCount: number;
}

export async function fetchCommunityPosts(
  supabase: SupabaseClient,
  { blindStatus = "all", page = 1, limit = 20 }: FetchPostsParams
): Promise<FetchPostsResult> {
  let query = supabase
    .from("posts")
    .select(
      "id, author_id, title, content, blind_status, report_count, created_at, updated_at, author:users!posts_author_id_fkey(nickname, real_name)",
      { count: "exact" }
    );

  if (blindStatus !== "all") {
    query = query.eq("blind_status", blindStatus);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`게시글 목록 조회 실패: ${error.message}`);
  }

  return {
    posts: (data ?? []) as unknown as CommunityPost[],
    totalCount: count ?? 0,
  };
}

interface FetchCommentsParams {
  blindStatus?: "all" | BlindStatus;
  page?: number;
  limit?: number;
}

interface FetchCommentsResult {
  comments: CommunityComment[];
  totalCount: number;
}

export async function fetchCommunityComments(
  supabase: SupabaseClient,
  { blindStatus = "all", page = 1, limit = 20 }: FetchCommentsParams
): Promise<FetchCommentsResult> {
  let query = supabase
    .from("comments")
    .select(
      "id, post_id, author_id, content, blind_status, report_count, created_at, author:users!comments_author_id_fkey(nickname, real_name)",
      { count: "exact" }
    );

  if (blindStatus !== "all") {
    query = query.eq("blind_status", blindStatus);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`댓글 목록 조회 실패: ${error.message}`);
  }

  return {
    comments: (data ?? []) as unknown as CommunityComment[],
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
    .update({ blind_status: "BLINDED" })
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
    .update({ blind_status: "VISIBLE" })
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
    .update({ blind_status: "BLINDED" })
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
    .update({ blind_status: "VISIBLE" })
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

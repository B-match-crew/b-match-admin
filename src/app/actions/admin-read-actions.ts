"use server";

import { createAdminClient } from "@/src/shared/api/supabase-admin";
import type { UserStatus } from "@/src/entities/user/types";
import type { MatchStatus } from "@/src/entities/matching/types";
import type { ReportStatus } from "@/src/entities/report/types";
import type { SettlementStatus } from "@/src/entities/settlement/types";
import type { AuditAction, AuditTargetType } from "@/src/entities/audit/types";

// ─── 유저 관리 ───

export async function adminFetchUsers(params: {
  search?: string;
  status?: "all" | UserStatus;
  role?: "all" | "user" | "host";
  page?: number;
  limit?: number;
}) {
  const { search, status = "all", role = "all", page = 1, limit = 20 } = params;
  const supabase = createAdminClient();

  let query = supabase
    .from("users")
    .select("*, host_profiles(*)", { count: "exact" });

  if (search && search.trim()) {
    query = query.or(
      `nickname.ilike.%${search}%,real_name.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (role === "host") {
    query = query.eq("is_host", true);
  } else if (role === "user") {
    query = query.eq("is_host", false);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`유저 목록 조회 실패: ${error.message}`);
  }

  return { users: data ?? [], totalCount: count ?? 0 };
}

export async function adminFetchUserById(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("*, host_profiles(*)")
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(`유저 조회 실패: ${error.message}`);
  }

  return data;
}

// ─── 매칭 관리 ───

export async function adminFetchMatchings(params: {
  search?: string;
  status?: "all" | MatchStatus;
  page?: number;
  limit?: number;
}) {
  const { search, status = "all", page = 1, limit = 20 } = params;
  const supabase = createAdminClient();

  let query = supabase
    .from("matches")
    .select("*, host:users!matches_host_id_fkey(nickname, real_name)", {
      count: "exact",
    });

  if (search && search.trim()) {
    query = query.or(
      `title.ilike.%${search}%,location_name.ilike.%${search}%`
    );
  }

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`매칭 목록 조회 실패: ${error.message}`);
  }

  return { matches: data ?? [], totalCount: count ?? 0 };
}

// ─── 커뮤니티 관리 ───

export type BlindFilter = "all" | "visible" | "blinded" | "deleted";

export async function adminFetchCommunityPosts(params: {
  blindFilter?: BlindFilter;
  page?: number;
  limit?: number;
}) {
  const { blindFilter = "all", page = 1, limit = 20 } = params;
  const supabase = createAdminClient();

  let query = supabase
    .from("posts")
    .select(
      "id, author_id, title, content, is_blind, is_deleted, created_at, updated_at, author:users!posts_author_id_fkey(nickname, real_name)",
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

  const posts = (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    report_count: 0,
  }));

  return { posts, totalCount: count ?? 0 };
}

export async function adminFetchCommunityComments(params: {
  blindFilter?: BlindFilter;
  page?: number;
  limit?: number;
}) {
  const { blindFilter = "all", page = 1, limit = 20 } = params;
  const supabase = createAdminClient();

  let query = supabase
    .from("comments")
    .select(
      "id, post_id, author_id, content, is_blind, is_deleted, created_at, author:users!comments_author_id_fkey(nickname, real_name)",
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

  const comments = (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    report_count: 0,
  }));

  return { comments, totalCount: count ?? 0 };
}

// ─── 신고/분쟁 관리 ───

export async function adminFetchReports(params: {
  status?: "all" | ReportStatus;
  page?: number;
  limit?: number;
}) {
  const { status = "all", page = 1, limit = 20 } = params;
  const supabase = createAdminClient();

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

  const typeLabels: Record<string, string> = {
    POST: "게시글",
    COMMENT: "댓글",
    MATCH: "매칭",
    HOST_NOSHOW: "호스트 노쇼",
  };

  const reports = (data ?? []).map((item) => {
    const row = item as Record<string, unknown>;
    const reporter = row.reporter as {
      nickname: string;
      real_name: string | null;
    } | null;
    const targetType = row.target_type as string;
    const targetId = row.target_id as string;
    return {
      ...(row as unknown as Record<string, unknown>),
      reporter,
      reporter_nickname: reporter?.nickname,
      target_label: `${typeLabels[targetType] ?? targetType} #${targetId}`,
    };
  });

  return { reports, totalCount: count ?? 0 };
}

export async function adminFetchReportById(reportId: string) {
  const supabase = createAdminClient();

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
    if (post) targetContent = `${post.title}\n${post.content}`;
  } else if (targetType === "COMMENT") {
    const { data: comment } = await supabase
      .from("comments")
      .select("content")
      .eq("id", targetId)
      .single();
    if (comment) targetContent = comment.content;
  } else if (targetType === "MATCH") {
    const { data: match } = await supabase
      .from("matches")
      .select("title, status")
      .eq("id", targetId)
      .single();
    if (match) targetContent = `${match.title} (상태: ${match.status})`;
  } else if (targetType === "HOST_NOSHOW") {
    const { data: match } = await supabase
      .from("matches")
      .select("title")
      .eq("id", targetId)
      .single();
    if (match) targetContent = `호스트 노쇼: ${match.title}`;
  }

  const reporter = row.reporter as {
    nickname: string;
    real_name: string | null;
  } | null;

  const typeLabels: Record<string, string> = {
    POST: "게시글",
    COMMENT: "댓글",
    MATCH: "매칭",
    HOST_NOSHOW: "호스트 노쇼",
  };

  return {
    report: {
      ...(row as unknown as Record<string, unknown>),
      reporter,
      reporter_nickname: reporter?.nickname,
      target_label: `${typeLabels[targetType] ?? targetType} #${targetId}`,
    },
    reporterInfo: reporter,
    targetContent,
  };
}

export async function adminFetchPastReports(
  targetUserId: string,
  excludeReportId?: string
) {
  const supabase = createAdminClient();

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

  return data ?? [];
}

// ─── 정산/환불 관리 ───

export async function adminFetchSettlements(params: {
  status?: "all" | SettlementStatus;
  page?: number;
  limit?: number;
}) {
  const { status = "all", page = 1, limit = 20 } = params;
  const supabase = createAdminClient();

  let query = supabase
    .from("settlement_requests")
    .select(
      "*, host:users!settlement_requests_host_id_fkey(nickname, real_name)",
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
    throw new Error(`정산 목록 조회 실패: ${error.message}`);
  }

  return { settlements: data ?? [], totalCount: count ?? 0 };
}

export async function adminFetchRefunds(params: {
  status?: "all" | SettlementStatus;
  page?: number;
  limit?: number;
}) {
  const { status = "all", page = 1, limit = 20 } = params;
  const supabase = createAdminClient();

  let query = supabase
    .from("refund_requests")
    .select(
      "*, guest:users!refund_requests_guest_id_fkey(nickname, real_name), match:matches!refund_requests_match_id_fkey(title)",
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
    throw new Error(`환불 목록 조회 실패: ${error.message}`);
  }

  return { refunds: data ?? [], totalCount: count ?? 0 };
}

// ─── 푸시 알림 ───

export async function adminFetchPushHistory(page: number, limit: number) {
  const supabase = createAdminClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await supabase
    .from("push_notifications")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(`푸시 이력 조회 실패: ${error.message}`);

  return { data: data ?? [], total: count ?? 0 };
}

// ─── 감사 로그 ───

export async function adminFetchAuditLogs(params: {
  actionType?: "all" | AuditAction;
  targetType?: "all" | AuditTargetType;
  page?: number;
  limit?: number;
}) {
  const {
    actionType = "all",
    targetType = "all",
    page = 1,
    limit = 20,
  } = params;
  const supabase = createAdminClient();

  let query = supabase
    .from("admin_audit_logs")
    .select(
      "*, admin:admin_users!admin_audit_logs_admin_id_fkey(email, role)",
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

  const logs = (data ?? []).map((item) => {
    const row = item as Record<string, unknown>;
    return {
      ...(row as unknown as Record<string, unknown>),
      admin: row.admin as { email: string; role: string } | null,
    };
  });

  return { logs, totalCount: count ?? 0 };
}

// ─── 배티켓 관리 ───

export async function adminFetchBatticketUsers(params: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { search, page = 1, limit = 20 } = params;
  const supabase = createAdminClient();

  let query = supabase
    .from("users")
    .select("id, nickname, real_name, badticket_score, status, is_host", {
      count: "exact",
    });

  if (search && search.trim()) {
    query = query.or(
      `nickname.ilike.%${search}%,real_name.ilike.%${search}%`
    );
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query
    .order("badticket_score", { ascending: true })
    .range(from, to);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`배티켓 사용자 조회 실패: ${error.message}`);
  }

  return { users: data ?? [], totalCount: count ?? 0 };
}

export async function adminFetchBatticketEvents(params: {
  userId: string;
  page?: number;
  limit?: number;
}) {
  const { userId, page = 1, limit = 30 } = params;
  const supabase = createAdminClient();

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await supabase
    .from("badticket_events")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`배티켓 이벤트 조회 실패: ${error.message}`);
  }

  return { events: data ?? [], totalCount: count ?? 0 };
}

// ─── 시스템 설정 ───

export async function adminFetchAppConfigs() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("app_config")
    .select("*")
    .order("key", { ascending: true });

  if (error) {
    throw new Error(`설정 조회 실패: ${error.message}`);
  }

  return data ?? [];
}

export async function adminFetchSystemStatus() {
  const supabase = createAdminClient();
  const [usersResult, matchesResult, reportsResult, settlementsResult] =
    await Promise.all([
      supabase
        .from("users")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .in("status", ["RECRUITING", "CLOSED", "IN_PROGRESS"]),
      supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "PENDING"),
      supabase
        .from("settlement_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ["PENDING", "EXPORTED"]),
    ]);

  return {
    totalUsers: usersResult.count ?? 0,
    activeMatches: matchesResult.count ?? 0,
    pendingReports: reportsResult.count ?? 0,
    pendingSettlements: settlementsResult.count ?? 0,
  };
}

// ─── 재무 대시보드 ───

export async function adminFetchFinanceSummary() {
  const supabase = createAdminClient();

  const { data: payments } = await supabase
    .from("payments")
    .select("amount, refunded_amount, status");

  const totalRevenue = (payments ?? [])
    .filter((p) => p.status === "PAID" || p.status === "REFUNDED")
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const totalRefunded = (payments ?? []).reduce(
    (sum, p) => sum + (p.refunded_amount ?? 0),
    0
  );

  const { data: pendingSettlementData, count: pendingSettlementCount } =
    await supabase
      .from("settlement_requests")
      .select("amount", { count: "exact" })
      .eq("status", "PENDING");

  const pendingSettlements = (pendingSettlementData ?? []).reduce(
    (sum, s) => sum + (s.amount ?? 0),
    0
  );

  const { data: pendingRefundData, count: pendingRefundCount } =
    await supabase
      .from("refund_requests")
      .select("amount", { count: "exact" })
      .eq("status", "PENDING");

  const pendingRefunds = (pendingRefundData ?? []).reduce(
    (sum, r) => sum + (r.amount ?? 0),
    0
  );

  const { data: completedData } = await supabase
    .from("settlement_requests")
    .select("amount")
    .eq("status", "COMPLETED");

  const completedSettlements = (completedData ?? []).reduce(
    (sum, s) => sum + (s.amount ?? 0),
    0
  );

  const { data: failedData } = await supabase
    .from("settlement_requests")
    .select("amount")
    .eq("status", "FAILED");

  const failedSettlements = (failedData ?? []).reduce(
    (sum, s) => sum + (s.amount ?? 0),
    0
  );

  return {
    totalRevenue,
    totalRefunded,
    pendingSettlements,
    pendingRefunds,
    completedSettlements,
    failedSettlements,
    pendingSettlementCount: pendingSettlementCount ?? 0,
    pendingRefundCount: pendingRefundCount ?? 0,
  };
}

export async function adminFetchRecentTransactions(limit = 10) {
  const supabase = createAdminClient();

  interface TransactionItem {
    id: string;
    type: "payment" | "settlement" | "refund";
    amount: number;
    status: string;
    label: string;
    created_at: string;
  }

  const transactions: TransactionItem[] = [];

  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, status, created_at, match:matches(title)")
    .order("created_at", { ascending: false })
    .limit(limit);

  for (const p of payments ?? []) {
    const row = p as Record<string, unknown>;
    const matchArr = row.match as { title: string }[] | null;
    transactions.push({
      id: row.id as string,
      type: "payment",
      amount: row.amount as number,
      status: row.status as string,
      label: matchArr?.[0]?.title ?? `결제 #${row.id}`,
      created_at: row.created_at as string,
    });
  }

  const { data: settlements } = await supabase
    .from("settlement_requests")
    .select(
      "id, amount, status, created_at, host:users!settlement_requests_host_id_fkey(nickname)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  for (const s of settlements ?? []) {
    const row = s as Record<string, unknown>;
    const hostArr = row.host as { nickname: string }[] | null;
    transactions.push({
      id: row.id as string,
      type: "settlement",
      amount: row.amount as number,
      status: row.status as string,
      label: hostArr?.[0]?.nickname ?? `정산 #${row.id}`,
      created_at: row.created_at as string,
    });
  }

  const { data: refunds } = await supabase
    .from("refund_requests")
    .select(
      "id, amount, status, created_at, guest:users!refund_requests_guest_id_fkey(nickname)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  for (const r of refunds ?? []) {
    const row = r as Record<string, unknown>;
    const guestArr = row.guest as { nickname: string }[] | null;
    transactions.push({
      id: row.id as string,
      type: "refund",
      amount: row.amount as number,
      status: row.status as string,
      label: guestArr?.[0]?.nickname ?? `환불 #${row.id}`,
      created_at: row.created_at as string,
    });
  }

  transactions.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return transactions.slice(0, limit);
}

// ─── 유저 상세 이력 ───

export async function adminFetchUserMatchHistory(userId: string) {
  const supabase = createAdminClient();
  const { data: apps } = await supabase
    .from("applications")
    .select(
      "id, status, match:match_id(id, title, start_time, status, location_name)"
    )
    .eq("guest_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (apps ?? [])
    .filter((a: Record<string, unknown>) => a.match)
    .map((a: Record<string, unknown>) => {
      const m = a.match as Record<string, unknown>;
      return {
        id: m.id as string,
        title: m.title as string,
        start_time: m.start_time as string,
        status: a.status as string,
        location_name: m.location_name as string,
      };
    });
}

export async function adminFetchUserPaymentHistory(userId: string) {
  const supabase = createAdminClient();
  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, status, created_at, match:match_id(title)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return payments ?? [];
}

export async function adminFetchUserReportHistory(userId: string) {
  const supabase = createAdminClient();
  const { data: reports } = await supabase
    .from("reports")
    .select("id, target_type, reason, status, created_at")
    .eq("target_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return reports ?? [];
}

export async function adminFetchUserBadticketHistory(userId: string) {
  const supabase = createAdminClient();
  const { data: events } = await supabase
    .from("badticket_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  return events ?? [];
}

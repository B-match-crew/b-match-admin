"use server";

import type {
  ReportListItem,
  ReportSearchParams,
} from "../model/actions";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { runAction, type ActionResult } from "@/src/shared/lib/action-result";
import { requireAdmin } from "@/src/shared/lib/role-guard";
import {
  rpcDeleteMatch,
  rpcSuspendUser,
  rpcBanUser,
} from "@/src/shared/api/rpc";
import { REASON_MIN_LENGTH } from "@/src/shared/config/constants";
import type {
  ContactType,
  MatchStatus,
  ReportStatus,
  UserStatus,
} from "@/src/shared/types/db";

export async function fetchReports(
  params: ReportSearchParams
): Promise<ActionResult<ReportListItem[]>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();
    const limit = params.limit ?? 100;

    let q = supabase
      .from("match_reports")
      .select(
        "id, status, reason, detail, created_at, match_id, reporter_id, host_id"
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (params.status && params.status !== "ALL") {
      q = q.eq("status", params.status);
    }

    const { data: reports, error } = await q;
    if (error) throw error;
    if (!reports || reports.length === 0) return [];

    // ─ 관련 매칭/유저 일괄 조회 후 맵 구성 ─
    const matchIds = [...new Set(reports.map((r) => r.match_id))];
    const userIds = [
      ...new Set(reports.flatMap((r) => [r.reporter_id, r.host_id])),
    ];

    const [matchesRes, usersRes] = await Promise.all([
      supabase
        .from("matches")
        .select(
          "id, title, status, deleted_at, description, contact_type, contact_value, location_name"
        )
        .in("id", matchIds),
      supabase
        .from("users")
        .select("id, nickname, name, user_status")
        .in("id", userIds),
    ]);
    if (matchesRes.error) throw matchesRes.error;
    if (usersRes.error) throw usersRes.error;

    const matchMap = new Map(
      (matchesRes.data ?? []).map((m) => [m.id as number, m])
    );
    const userMap = new Map(
      (usersRes.data ?? []).map((u) => [u.id as number, u])
    );

    // 매칭별 신고 수(현재 범위) 집계
    const countByMatch = new Map<number, number>();
    for (const r of reports) {
      countByMatch.set(r.match_id, (countByMatch.get(r.match_id) ?? 0) + 1);
    }

    const items: ReportListItem[] = reports.map((r) => {
      const m = matchMap.get(r.match_id);
      const reporter = userMap.get(r.reporter_id);
      const host = userMap.get(r.host_id);
      return {
        id: r.id as number,
        status: r.status as ReportStatus,
        reason: r.reason as string,
        detail: r.detail as string | null,
        created_at: r.created_at as string,
        match_id: r.match_id as number,
        match: m
          ? {
              id: m.id as number,
              title: m.title as string,
              status: m.status as MatchStatus,
              deleted_at: m.deleted_at as string | null,
              description: m.description as string | null,
              contact_type: m.contact_type as ContactType,
              contact_value: m.contact_value as string,
              location_name: m.location_name as string,
            }
          : null,
        reporter_id: r.reporter_id as number,
        reporter: reporter
          ? { nickname: reporter.nickname, name: reporter.name }
          : null,
        host_id: r.host_id as number,
        host: host
          ? {
              id: host.id as number,
              nickname: host.nickname,
              name: host.name,
              user_status: host.user_status as UserStatus,
            }
          : null,
        matchReportCount: countByMatch.get(r.match_id) ?? 1,
      };
    });

    // PENDING 우선 → 그 안에서 최신순(이미 created_at desc 정렬됨)
    return items.sort((a, b) => {
      const ap = a.status === "PENDING" ? 0 : 1;
      const bp = b.status === "PENDING" ? 0 : 1;
      return ap - bp;
    });
  });
}

// ─── 액션 ───

/**
 * 신고 상태 단건 변경 (검토중/반려).
 * 전용 RPC 없음 → service_role 로 직접 UPDATE (requireAdmin 으로 게이트).
 */
export async function setReportStatusAction(p: {
  reportId: number;
  status: Extract<ReportStatus, "REVIEWED" | "DISMISSED">;
}): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("match_reports")
      .update({ status: p.status })
      .eq("id", p.reportId);
    if (error) throw error;
    revalidatePath("/reports");
  });
}

/** 같은 매칭글의 모든 신고 일괄 반려 */
export async function dismissAllForMatchAction(p: {
  matchId: number;
}): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("match_reports")
      .update({ status: "DISMISSED" })
      .eq("match_id", p.matchId)
      .neq("status", "ACTIONED"); // 이미 조치된 건은 보존
    if (error) throw error;
    revalidatePath("/reports");
  });
}

/**
 * 방침 위반 → 매칭글 직권 삭제 후 해당 글의 모든 신고를 ACTIONED 로 마킹.
 * fn_admin_delete_match 는 SUPER 전용 + auth.uid() 검사 → 유저 세션 RPC 사용.
 * (호스트 ADMIN_NOTICE 알림 + admin_audit_logs 기록은 RPC 내부에서 처리)
 */
export async function resolveMatchAction(p: {
  matchId: number;
  reason: string;
}): Promise<ActionResult<void>> {
  return runAction(async () => {
    if (p.reason.trim().length < REASON_MIN_LENGTH) {
      throw new Error(`사유는 ${REASON_MIN_LENGTH}자 이상 입력해야 합니다`);
    }
    await requireAdmin("SUPER_ADMIN");

    await rpcDeleteMatch({ matchId: p.matchId, reason: p.reason });

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("match_reports")
      .update({ status: "ACTIONED" })
      .eq("match_id", p.matchId);
    if (error) throw error;

    revalidatePath("/reports");
    revalidatePath("/matches");
  });
}

/** 악성 호스트 일시 정지 (MANAGER 이상) */
export async function suspendHostAction(p: {
  userId: number;
  until: string;
  reason: string;
}): Promise<ActionResult<void>> {
  return runAction(async () => {
    if (p.reason.trim().length < REASON_MIN_LENGTH) {
      throw new Error(`사유는 ${REASON_MIN_LENGTH}자 이상 입력해야 합니다`);
    }
    await requireAdmin("MANAGER");
    await rpcSuspendUser({
      userId: p.userId,
      until: p.until,
      reason: p.reason,
    });
    revalidatePath("/reports");
    revalidatePath("/users");
  });
}

/** 악성 호스트 영구 차단 (SUPER 전용) */
export async function banHostAction(p: {
  userId: number;
  reason: string;
}): Promise<ActionResult<void>> {
  return runAction(async () => {
    if (p.reason.trim().length < REASON_MIN_LENGTH) {
      throw new Error(`사유는 ${REASON_MIN_LENGTH}자 이상 입력해야 합니다`);
    }
    await requireAdmin("SUPER_ADMIN");
    await rpcBanUser({ userId: p.userId, reason: p.reason });
    revalidatePath("/reports");
    revalidatePath("/users");
  });
}

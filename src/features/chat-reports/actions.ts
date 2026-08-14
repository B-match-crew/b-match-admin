"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { runAction, type ActionResult } from "@/src/shared/lib/action-result";
import { requireAdmin } from "@/src/shared/lib/role-guard";
import { rpcSuspendUser, rpcBanUser } from "@/src/shared/api/rpc";
import { REASON_MIN_LENGTH } from "@/src/shared/config/constants";
import type { ReportStatus, UserStatus } from "@/src/shared/types/db";

/**
 * 신고 시점에 **복사해 둔** 대화 한 줄 (`chat_reports.snapshot`).
 *
 * 참조가 아니라 복사인 이유: 원본 대화는 30일에 파기된다(app migration 63).
 * 참조로 뒀다면 운영자가 검토할 때 증적이 이미 사라져 있다.
 *
 * `sender_id === null` 은 **시스템 메시지**(일정 안내)다 — 앱과 같은 규약이며,
 * 이 NULL 을 "탈퇴한 유저" 로 읽으면 안 된다.
 */
export interface ChatSnapshotMessage {
  id: number;
  sender_id: number | null;
  kind: "TEXT" | "SCHEDULE_NOTICE";
  body: string;
  created_at: string;
}

/**
 * 채팅 신고 1행. `chat_reports` 를 신고자/피신고자와 합친 형태.
 *
 * 매칭글 신고(`match_reports`)와 **테이블이 다르다.** 신고 대상이 글이 아니라
 * 대화라, 검토에 필요한 것이 "어떤 글인가"가 아니라 "무슨 말이 오갔나"다.
 * 그래서 여기엔 매칭 정보 대신 [snapshot] 이 있다.
 *
 * 조인은 매칭 신고와 같은 이유로 **수동**이다 — users 로 가는 FK 가 2개
 * (reporter_id, target_id)라 PostgREST 임베드는 제약 이름을 요구한다.
 */
export interface ChatReportListItem {
  id: number;
  status: ReportStatus;
  reason: string;
  detail: string | null;
  created_at: string;
  /** 방이 파기되면 null 이 된다(ON DELETE SET NULL). 신고 이력 자체는 남는다. */
  room_id: number | null;
  reporter_id: number;
  reporter: { nickname: string | null; name: string | null } | null;
  target_id: number;
  target: {
    id: number;
    nickname: string | null;
    name: string | null;
    user_status: UserStatus;
  } | null;
  snapshot: ChatSnapshotMessage[];
  /** 같은 유저가 피신고된 총 건수(현재 조회 범위 기준) */
  targetReportCount: number;
}

export interface ChatReportSearchParams {
  status?: ReportStatus | "ALL";
  limit?: number;
}

export async function fetchChatReports(
  params: ChatReportSearchParams
): Promise<ActionResult<ChatReportListItem[]>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();
    const limit = params.limit ?? 100;

    let q = supabase
      .from("chat_reports")
      .select(
        "id, status, reason, detail, created_at, room_id, reporter_id, target_id, snapshot"
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (params.status && params.status !== "ALL") {
      q = q.eq("status", params.status);
    }

    const { data: reports, error } = await q;
    if (error) throw error;
    if (!reports || reports.length === 0) return [];

    const userIds = [
      ...new Set(reports.flatMap((r) => [r.reporter_id, r.target_id])),
    ];
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, nickname, name, user_status")
      .in("id", userIds);
    if (usersError) throw usersError;

    const userMap = new Map((users ?? []).map((u) => [u.id as number, u]));

    const countByTarget = new Map<number, number>();
    for (const r of reports) {
      countByTarget.set(
        r.target_id,
        (countByTarget.get(r.target_id) ?? 0) + 1
      );
    }

    const items: ChatReportListItem[] = reports.map((r) => {
      const reporter = userMap.get(r.reporter_id);
      const target = userMap.get(r.target_id);
      return {
        id: r.id as number,
        status: r.status as ReportStatus,
        reason: r.reason as string,
        detail: r.detail as string | null,
        created_at: r.created_at as string,
        room_id: r.room_id as number | null,
        reporter_id: r.reporter_id as number,
        reporter: reporter
          ? { nickname: reporter.nickname, name: reporter.name }
          : null,
        target_id: r.target_id as number,
        target: target
          ? {
              id: target.id as number,
              nickname: target.nickname,
              name: target.name,
              user_status: target.user_status as UserStatus,
            }
          : null,
        // 서버가 시간순(id asc)으로 담아 두므로 그대로 쓴다 — 운영자가 대화를
        // 위에서 아래로 읽는다.
        snapshot: normalizeSnapshot(r.snapshot),
        targetReportCount: countByTarget.get(r.target_id) ?? 1,
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

/**
 * jsonb 를 화면이 믿을 수 있는 모양으로 좁힌다.
 *
 * 스냅샷은 신고 시점의 **복사본**이라 스키마가 바뀌어도 옛 행은 옛 모양 그대로
 * 남는다. 여기서 걸러내지 않으면 몇 달 전 신고 하나가 상세 화면을 통째로
 * 터뜨린다 — 증적을 보려고 여는 화면이 증적 때문에 안 열리는 셈이다.
 */
function normalizeSnapshot(raw: unknown): ChatSnapshotMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((m) => {
    if (typeof m !== "object" || m === null) return [];
    const row = m as Record<string, unknown>;
    if (typeof row.body !== "string") return [];
    return [
      {
        id: typeof row.id === "number" ? row.id : 0,
        sender_id: typeof row.sender_id === "number" ? row.sender_id : null,
        kind: row.kind === "SCHEDULE_NOTICE" ? "SCHEDULE_NOTICE" : "TEXT",
        body: row.body,
        created_at:
          typeof row.created_at === "string" ? row.created_at : "",
      },
    ];
  });
}

// ─── 액션 ───

/**
 * 신고 상태 단건 변경 (검토중/반려).
 * 전용 RPC 없음 → service_role 로 직접 UPDATE (requireAdmin 으로 게이트).
 */
export async function setChatReportStatusAction(p: {
  reportId: number;
  status: Extract<ReportStatus, "REVIEWED" | "DISMISSED">;
}): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("chat_reports")
      .update({ status: p.status })
      .eq("id", p.reportId);
    if (error) throw error;
    revalidatePath("/chat-reports");
  });
}

/**
 * 대화 상대 일시 정지 (MANAGER 이상) + 해당 신고를 ACTIONED 로.
 *
 * 매칭 신고와 달리 "글 삭제" 같은 대상 제재가 없다 — 지울 대상이 대화뿐이고,
 * 대화를 지우면 증적이 사라진다. 그래서 조치는 **사람**에게만 한다.
 */
export async function suspendChatUserAction(p: {
  reportId: number;
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
    await markActioned(p.reportId);
    revalidatePath("/chat-reports");
    revalidatePath("/users");
  });
}

/** 대화 상대 영구 차단 (SUPER 전용) + 해당 신고를 ACTIONED 로. */
export async function banChatUserAction(p: {
  reportId: number;
  userId: number;
  reason: string;
}): Promise<ActionResult<void>> {
  return runAction(async () => {
    if (p.reason.trim().length < REASON_MIN_LENGTH) {
      throw new Error(`사유는 ${REASON_MIN_LENGTH}자 이상 입력해야 합니다`);
    }
    await requireAdmin("SUPER_ADMIN");
    await rpcBanUser({ userId: p.userId, reason: p.reason });
    await markActioned(p.reportId);
    revalidatePath("/chat-reports");
    revalidatePath("/users");
  });
}

async function markActioned(reportId: number) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("chat_reports")
    .update({ status: "ACTIONED" })
    .eq("id", reportId);
  if (error) throw error;
}

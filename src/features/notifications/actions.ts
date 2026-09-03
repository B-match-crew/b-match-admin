"use server";

import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { runAction, type ActionResult } from "@/src/shared/lib/action-result";
import { requireAdmin } from "@/src/shared/lib/role-guard";
import { kstRange } from "@/src/shared/lib/kst-range";

/**
 * 알림 발송 현황 (app migration 41~54 · 64 · 88).
 *
 * 여태 어드민에는 **보내는 버튼만 있고 결과를 보는 창이 없었다.** 공지를
 * 발송하면 "N명에게 보냈다" 는 숫자만 돌아오고, 그 뒤에 몇 건이 FAILED 로
 * 떨어졌는지 · 토큰이 없어 SKIPPED 됐는지는 SQL 콘솔을 열어야 보였다.
 * `notifications.fail_reason` 은 조용히 실패하는 종류의 **유일한 단서**다.
 *
 * 집계는 88 의 fn_admin_notification_summary / fn_admin_push_reach 가 한다 —
 * PostgREST 는 GROUP BY 를 못 하고, 행을 다 받아 세면 max-rows(1000)에 걸려
 * 조용히 잘린 통계가 나온다. 실패 **목록**은 집계가 아니라 단순 조회라 여기서
 * 직접 읽는다.
 */

// ─── 1. 발송 요약 ───

export interface StatusCount {
  status: string;
  cnt: number;
}

export interface CategoryCount {
  category: string;
  label: string | null;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  pending: number;
}

export interface DailyCount {
  day: string; // yyyy-MM-dd (KST)
  total: number;
  sent: number;
  failed: number;
  skipped: number;
}

export interface FailReason {
  reason: string;
  cnt: number;
}

export interface NotificationSummary {
  total: number;
  byStatus: StatusCount[];
  byCategory: CategoryCount[];
  daily: DailyCount[];
  failReasons: FailReason[];
}

interface RawSummary {
  total: number;
  by_status: { status: string; cnt: number }[];
  by_category: {
    category: string;
    label: string | null;
    total: number;
    sent: number;
    failed: number;
    skipped: number;
    pending: number;
  }[];
  daily: DailyCount[];
  fail_reasons: FailReason[];
}

export async function fetchNotificationSummary(
  days = 30,
  category?: string
): Promise<ActionResult<NotificationSummary>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();
    const { from, to } = kstRange(days);

    const { data, error } = await supabase.rpc(
      "fn_admin_notification_summary",
      { p_from: from, p_to: to, p_category: category ?? null }
    );
    if (error) throw error;

    const r = (data ?? {}) as RawSummary;
    return {
      total: r.total ?? 0,
      byStatus: r.by_status ?? [],
      byCategory: (r.by_category ?? []).map((c) => ({
        category: c.category,
        label: c.label,
        total: c.total,
        sent: c.sent,
        failed: c.failed,
        skipped: c.skipped,
        pending: c.pending,
      })),
      daily: r.daily ?? [],
      failReasons: r.fail_reasons ?? [],
    };
  });
}

// ─── 2. 최근 실패 내역 ───

export interface FailedNotification {
  id: number;
  userId: number;
  nickname: string | null;
  name: string | null;
  type: string;
  category: string | null;
  title: string | null;
  failReason: string | null;
  createdAt: string;
  sentAt: string | null;
}

/**
 * 최근 실패(FAILED) 목록.
 *
 * 유저 정보는 조인 임베드 대신 두 번 나눠 읽는다 — PostgREST 임베드는 FK
 * **제약 이름**에 묶여 있어 스키마가 손대는 순간 조용히 깨진다(신고 관리도
 * 같은 이유로 나눠 읽는다).
 */
export async function fetchRecentFailures(
  limit = 50
): Promise<ActionResult<FailedNotification[]>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_id, type, category, title, fail_reason, created_at, sent_at")
      .eq("send_status", "FAILED")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;

    const rows = (data ?? []) as {
      id: number;
      user_id: number;
      type: string;
      category: string | null;
      title: string | null;
      fail_reason: string | null;
      created_at: string;
      sent_at: string | null;
    }[];
    if (rows.length === 0) return [];

    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const { data: users, error: userErr } = await supabase
      .from("users")
      .select("id, nickname, name")
      .in("id", userIds);
    if (userErr) throw userErr;

    const byId = new Map(
      (users ?? []).map((u) => [u.id as number, u as { nickname: string | null; name: string | null }])
    );

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      nickname: byId.get(r.user_id)?.nickname ?? null,
      name: byId.get(r.user_id)?.name ?? null,
      type: r.type,
      category: r.category,
      title: r.title,
      failReason: r.fail_reason,
      createdAt: r.created_at,
      sentAt: r.sent_at,
    }));
  });
}


// ─── 4. 알림 카테고리 (49 / 54 / 68) ───

export interface NotificationCategory {
  code: string;
  label: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  isMandatory: boolean;
  defaultEnabled: boolean;
  requiresHost: boolean;
  storage: string;
  androidChannelId: string | null;
  iosInterruptionLevel: string | null;
  updatedAt: string | null;
}

export async function fetchNotificationCategories(): Promise<
  ActionResult<NotificationCategory[]>
> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("notification_categories")
      .select(
        "code, label, description, sort_order, is_active, is_mandatory, default_enabled, requires_host, storage, android_channel_id, ios_interruption_level, updated_at"
      )
      .order("sort_order", { ascending: true });
    if (error) throw error;

    return (data ?? []).map((c) => ({
      code: c.code as string,
      label: c.label as string,
      description: (c.description ?? null) as string | null,
      sortOrder: (c.sort_order ?? 0) as number,
      isActive: Boolean(c.is_active),
      isMandatory: Boolean(c.is_mandatory),
      defaultEnabled: Boolean(c.default_enabled),
      requiresHost: Boolean(c.requires_host),
      storage: (c.storage ?? "SETTINGS") as string,
      androidChannelId: (c.android_channel_id ?? null) as string | null,
      iosInterruptionLevel: (c.ios_interruption_level ?? null) as string | null,
      updatedAt: (c.updated_at ?? null) as string | null,
    }));
  });
}

export interface UpdateCategoryParams {
  code: string;
  label: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

/**
 * 카테고리 문구·노출 수정.
 *
 * 49 가 카테고리를 "코드가 아니라 데이터" 로 옮긴 이유가 **앱 배포 없이 문구를
 * 바꾸기 위해서**인데, 편집 창이 없어 그 이점이 SQL 콘솔에서만 실현되고 있었다.
 *
 * 쓰기 정책이 없는 테이블이라 service_role 로 직접 UPDATE 한다(RLS 우회).
 * 대신 **감사 로그를 반드시 남긴다** — 앱 화면 문구가 서버에서 바뀌는데 기록이
 * 없으면 "누가 언제 왜 바꿨나" 를 되짚을 방법이 사라진다.
 *
 * 채널 정의(android_channel_id / ios_interruption_level)와 storage·is_mandatory
 * 는 **여기서 건드리지 않는다.** 채널 id 는 OS 가 한 번 만들면 이름을 무시하고,
 * storage 는 광고성 동의의 저장 위치를 정하는 값이라 잘못 바꾸면 동의 정본이
 * 갈린다. 둘 다 마이그레이션으로 다뤄야 할 값이다.
 */
export async function updateNotificationCategory(
  p: UpdateCategoryParams
): Promise<ActionResult<void>> {
  return runAction(async () => {
    const admin = await requireAdmin();
    const supabase = createAdminClient();

    const label = p.label.trim();
    if (label.length === 0) throw new Error("라벨을 입력해야 합니다");
    if (label.length > 50) throw new Error("라벨은 50자를 넘을 수 없습니다");
    const description = p.description?.trim() ?? null;
    if (description && description.length > 200) {
      throw new Error("설명은 200자를 넘을 수 없습니다");
    }

    const { data: before, error: beforeErr } = await supabase
      .from("notification_categories")
      .select("label, description, sort_order, is_active")
      .eq("code", p.code)
      .single();
    if (beforeErr) throw beforeErr;

    const { data: updated, error } = await supabase
      .from("notification_categories")
      .update({
        label,
        description,
        sort_order: p.sortOrder,
        is_active: p.isActive,
      })
      .eq("code", p.code)
      .select("code");
    if (error) throw error;
    // service_role 은 RLS 를 우회하지만 code 오타는 조용히 0행 갱신이 된다.
    if (!updated || updated.length === 0) {
      throw new Error("해당 카테고리를 찾을 수 없습니다");
    }

    const { error: logErr } = await supabase.from("admin_audit_logs").insert({
      admin_id: admin.id,
      action_type: "UPDATE_NOTIFICATION_CATEGORY",
      target_type: "NOTIFICATION_CATEGORY",
      target_id: p.code,
      detail: {
        before,
        after: {
          label,
          description,
          sort_order: p.sortOrder,
          is_active: p.isActive,
        },
      },
    });
    if (logErr) throw logErr;
  });
}

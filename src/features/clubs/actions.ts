"use server";

import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { requireAdmin } from "@/src/shared/lib/role-guard";
import type { DbHostProfile, DbUser } from "@/src/shared/types/db";

/**
 * 모임(클럽) = host_profiles.
 *
 * 도메인상 "모임"이 상위 개념이고 "매칭(matches)"은 그 모임이 올리는 개별
 * 모집글이다. host_profiles.user_id → users.id 이고, 한 유저는 모임을 최대
 * 1개 가진다(uk_host_profiles_user UNIQUE). 매칭은 matches.host_id → users.id
 * 로 유저에 직접 매달려 있어, 모임의 매칭 수 = 그 user_id 의 matches 수다.
 */

export interface ClubListItem
  extends Pick<
    DbHostProfile,
    | "id"
    | "user_id"
    | "club_name"
    | "min_level_required"
    | "gender_ratio_male"
    | "gender_ratio_female"
    | "created_at"
    | "deleted_at"
  > {
  host: Pick<DbUser, "nickname" | "name"> | null;
  /** 이 모임(user_id)이 올린 매칭 수 — 삭제 포함/제외는 파라미터로 */
  matchCount: number;
  activeMatchCount: number;
}

export interface ClubSearchParams {
  term?: string;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}

export interface ClubSearchResult {
  rows: ClubListItem[];
  total: number;
}

export async function fetchClubs(
  params: ClubSearchParams
): Promise<ClubSearchResult> {
  await requireAdmin();
  const supabase = createAdminClient();
  const term = params.term?.trim() ?? "";
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  let q = supabase
    .from("host_profiles")
    .select(
      `id, user_id, club_name, min_level_required, gender_ratio_male,
       gender_ratio_female, created_at, deleted_at,
       host:users!fk_host_profiles_user(nickname, name)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!params.includeDeleted) {
    q = q.is("deleted_at", null);
  }
  if (term.length > 0) {
    q = q.ilike("club_name", `%${term}%`);
  }

  const { data, error, count } = await q;
  if (error) throw error;

  const rows = (data ?? []) as unknown as (Omit<
    ClubListItem,
    "matchCount" | "activeMatchCount"
  >)[];

  // 매칭 수는 모임(user_id)별로 집계해 붙인다. 목록 페이지(최대 50건)라
  // user_id 목록으로 한 번에 받아 클라이언트에서 카운트한다.
  const userIds = rows.map((r) => r.user_id);
  const countByUser = new Map<number, { total: number; active: number }>();

  if (userIds.length > 0) {
    const { data: matches, error: mErr } = await supabase
      .from("matches")
      .select("host_id, deleted_at")
      .in("host_id", userIds);
    if (mErr) throw mErr;

    for (const m of (matches ?? []) as {
      host_id: number;
      deleted_at: string | null;
    }[]) {
      const c = countByUser.get(m.host_id) ?? { total: 0, active: 0 };
      c.total += 1;
      if (!m.deleted_at) c.active += 1;
      countByUser.set(m.host_id, c);
    }
  }

  return {
    rows: rows.map((r) => {
      const c = countByUser.get(r.user_id) ?? { total: 0, active: 0 };
      return { ...r, matchCount: c.total, activeMatchCount: c.active };
    }),
    total: count ?? 0,
  };
}

// ─── 모임 상세 ───

export type ClubDetail = DbHostProfile & {
  host: Pick<DbUser, "id" | "nickname" | "name" | "phone_number"> | null;
  matchCount: number;
  activeMatchCount: number;
};

export async function fetchClubDetail(clubId: number): Promise<ClubDetail> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("host_profiles")
    .select(`*, host:users!fk_host_profiles_user(id, nickname, name, phone_number)`)
    .eq("id", clubId)
    .single();
  if (error) throw error;

  const profile = data as unknown as ClubDetail;

  const { data: matches, error: mErr } = await supabase
    .from("matches")
    .select("deleted_at")
    .eq("host_id", profile.user_id);
  if (mErr) throw mErr;

  const list = (matches ?? []) as { deleted_at: string | null }[];
  return {
    ...profile,
    matchCount: list.length,
    activeMatchCount: list.filter((m) => !m.deleted_at).length,
  };
}

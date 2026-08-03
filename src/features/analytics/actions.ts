"use server";

import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { requireAdmin } from "@/src/shared/lib/role-guard";

/**
 * 분석 페이지 데이터 소스 — `app_events` / `user_daily_active` 기반.
 *
 * 기존 `/stats` 와 나눈 이유: 저쪽은 **DB 상태 스냅샷**(현재 유저 수, 지역
 * 분포)이고 여기는 **행동 퍼널·리텐션**이다. 성격이 달라 한 페이지에 섞으면
 * 둘 다 읽기 어려워진다.
 *
 * 집계는 전부 DB(migration 36·38 의 RPC)에서 끝낸다. PostgREST 로는 GROUP BY
 * 를 못 해 행을 다 받아 세야 하고, 기본 max-rows(1000)에 걸려 조용히 잘린
 * 통계가 나온다.
 *
 * 기간은 RPC 가 KST 로 끊는다 — 서버(Vercel)는 UTC 라 JS 로컬시각을 쓰면
 * 하루가 밀린다.
 */

/** KST 기준 오늘부터 [days]일 범위. */
function kstRange(days: number): { from: string; to: string } {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Seoul",
  });
  const fromDate = new Date(`${today}T00:00:00Z`);
  fromDate.setUTCDate(fromDate.getUTCDate() - (days - 1));
  return { from: fromDate.toISOString().slice(0, 10), to: today };
}

async function callRpc<T>(
  fn: string,
  params: Record<string, unknown>,
): Promise<T[]> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(fn, params);
  if (error) throw error;
  return (data ?? []) as T[];
}

// ─── 퍼널 (게스트 / 호스트) ───

export interface FunnelStep {
  stepOrder: number;
  stepName: string;
  users: number;
  /** 첫 단계 대비 잔존율(%). 첫 단계는 100. */
  retentionFromTop: number | null;
  /** 직전 단계 대비 전환율(%). 첫 단계는 null. */
  conversionFromPrev: number | null;
}

type RawFunnel = { step_order: number; step_name: string; users: number };

/** 퍼널 원본에 잔존율/단계 전환율을 붙인다 — 차트에서 계산하면 매 렌더 반복된다. */
function withRates(rows: RawFunnel[]): FunnelStep[] {
  const top = rows[0]?.users ?? 0;
  return rows.map((r, i) => {
    const prev = i === 0 ? null : rows[i - 1].users;
    return {
      stepOrder: r.step_order,
      stepName: r.step_name,
      users: r.users,
      retentionFromTop: top > 0 ? Math.round((r.users / top) * 1000) / 10 : null,
      conversionFromPrev:
        prev && prev > 0 ? Math.round((r.users / prev) * 1000) / 10 : null,
    };
  });
}

export async function fetchGuestFunnel(days = 30): Promise<FunnelStep[]> {
  const { from, to } = kstRange(days);
  const rows = await callRpc<RawFunnel>("fn_admin_funnel_guest", {
    p_from: from,
    p_to: to,
  });
  return withRates(rows);
}

export async function fetchHostFunnel(days = 30): Promise<FunnelStep[]> {
  const { from, to } = kstRange(days);
  const rows = await callRpc<RawFunnel>("fn_admin_funnel_host", {
    p_from: from,
    p_to: to,
  });
  return withRates(rows);
}

// ─── 활성 사용자 (DAU / WAU / MAU) ───

export interface ActiveUsersItem {
  date: string;
  dau: number;
  dauMember: number;
  wau: number;
  wauMember: number;
  mau: number;
  mauMember: number;
}

export async function fetchActiveUsers(days = 30): Promise<ActiveUsersItem[]> {
  const { from, to } = kstRange(days);
  const rows = await callRpc<{
    day: string;
    dau: number;
    dau_member: number;
    wau: number;
    wau_member: number;
    mau: number;
    mau_member: number;
  }>("fn_admin_active_users", { p_from: from, p_to: to });
  return rows.map((r) => ({
    date: r.day,
    dau: r.dau,
    dauMember: r.dau_member,
    wau: r.wau,
    wauMember: r.wau_member,
    mau: r.mau,
    mauMember: r.mau_member,
  }));
}

// ─── 코호트 리텐션 ───

export interface CohortItem {
  week: string;
  size: number;
  /** 재방문 **비율(%)**. 인원이 아니라 비율로 보는 게 주차 간 비교에 맞다. */
  d1: number | null;
  d7: number | null;
  d30: number | null;
}

export async function fetchRetentionCohort(days = 90): Promise<CohortItem[]> {
  const { from, to } = kstRange(days);
  const rows = await callRpc<{
    cohort_week: string;
    cohort_size: number;
    d1: number;
    d7: number;
    d30: number;
  }>("fn_admin_retention_cohort", { p_from: from, p_to: to });
  const pct = (n: number, size: number) =>
    size > 0 ? Math.round((n / size) * 1000) / 10 : null;
  return rows.map((r) => ({
    week: r.cohort_week,
    size: r.cohort_size,
    d1: pct(r.d1, r.cohort_size),
    d7: pct(r.d7, r.cohort_size),
    d30: pct(r.d30, r.cohort_size),
  }));
}

// ─── 수급 밸런스 ───

export interface SupplyDemandItem {
  region: string;
  supply: number;
  demand: number;
  /** 공급 1건당 수요. 높을수록 호스트 영업 우선순위가 높다. */
  demandPerSupply: number | null;
}

export async function fetchSupplyDemand(
  days = 30,
): Promise<SupplyDemandItem[]> {
  const { from, to } = kstRange(days);
  const rows = await callRpc<{
    region_1: string;
    supply: number;
    demand: number;
  }>("fn_admin_supply_demand", { p_from: from, p_to: to });
  return rows.map((r) => ({
    region: r.region_1 ?? "(미지정)",
    supply: r.supply,
    demand: r.demand,
    demandPerSupply:
      r.supply > 0 ? Math.round((r.demand / r.supply) * 10) / 10 : null,
  }));
}

// ─── 빈 결과 (수요-공급 갭) ───

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export interface DemandGapItem {
  region: string;
  weekday: string;
  level: string;
  emptyViews: number;
}

export async function fetchDemandGap(days = 30): Promise<DemandGapItem[]> {
  const { from, to } = kstRange(days);
  const rows = await callRpc<{
    region_1: string;
    weekday: number;
    level: string;
    empty_views: number;
  }>("fn_admin_demand_gap", { p_from: from, p_to: to });
  return rows.map((r) => ({
    region: r.region_1,
    weekday: WEEKDAYS[r.weekday] ?? "?",
    level: r.level,
    emptyViews: r.empty_views,
  }));
}

// ─── 매칭 전환율 랭킹 ───

export interface MatchConversionItem {
  matchId: number;
  title: string;
  region: string;
  views: number;
  contacts: number;
  /** 조회 대비 연락률(%). */
  conversion: number | null;
}

export async function fetchMatchConversion(
  days = 30,
  minViews = 10,
): Promise<MatchConversionItem[]> {
  const { from, to } = kstRange(days);
  const rows = await callRpc<{
    match_id: number;
    title: string;
    region_1: string;
    views: number;
    contacts: number;
    conversion: number | null;
  }>("fn_admin_match_conversion", {
    p_from: from,
    p_to: to,
    p_min_views: minViews,
    p_limit: 50,
  });
  return rows.map((r) => ({
    matchId: r.match_id,
    title: r.title,
    region: r.region_1,
    views: r.views,
    contacts: r.contacts,
    conversion: r.conversion,
  }));
}

// ─── 바이럴 퍼널 ───

export interface ViralStep {
  stepOrder: number;
  stepName: string;
  events: number;
  /** 직전 단계 대비 전환율(%). */
  conversionFromPrev: number | null;
}

export async function fetchViralFunnel(days = 30): Promise<ViralStep[]> {
  const { from, to } = kstRange(days);
  const rows = await callRpc<{
    step_order: number;
    step_name: string;
    events: number;
  }>("fn_admin_viral_funnel", { p_from: from, p_to: to });
  return rows.map((r, i) => {
    const prev = i === 0 ? null : rows[i - 1].events;
    return {
      stepOrder: r.step_order,
      stepName: r.step_name,
      events: r.events,
      conversionFromPrev:
        prev && prev > 0 ? Math.round((r.events / prev) * 1000) / 10 : null,
    };
  });
}

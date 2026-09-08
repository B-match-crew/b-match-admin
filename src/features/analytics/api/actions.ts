"use server";

import type {
  FunnelStep,
  ActiveUsersItem,
  SupplyDemandItem,
  DemandGapItem,
  ClubContactConversionItem,
  HostResponseOrder,
  HostResponsePage,
  ViralStep,
  RetentionGroup,
  RevisitCohortItem,
  VisitDaysItem,
  DormantSummary,
  VisitDaysCohortWeek,
  CohortCoverageItem,
  InquiryFunnelStep,
  InquiryWeeklyItem,
  RegionPotentialItem,
  HostOnboardingLag,
  HostReregistrationItem,
  SupplyConcentrationItem,
  Experience,
  RevisitByExperienceItem,
  RevisitByFirstSearchItem,
  CreateAbandonStep,
  PushPermissionFunnel,
  ReplyLatencyItem,
  PushReactivationItem,
} from "../model/actions";

import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { runAction, type ActionResult } from "@/src/shared/lib/action-result";
import { requireAdmin } from "@/src/shared/lib/role-guard";
import { kstRange } from "@/src/shared/lib/kst-range";

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

export async function fetchGuestFunnel(
  days = 30
): Promise<ActionResult<FunnelStep[]>> {
  return runAction(async () => {
    const { from, to } = kstRange(days);
    const rows = await callRpc<RawFunnel>("fn_admin_funnel_guest", {
      p_from: from,
      p_to: to,
    });
    return withRates(rows);
  });
}

export async function fetchHostFunnel(
  days = 30
): Promise<ActionResult<FunnelStep[]>> {
  return runAction(async () => {
    const { from, to } = kstRange(days);
    const rows = await callRpc<RawFunnel>("fn_admin_funnel_host", {
      p_from: from,
      p_to: to,
    });
    return withRates(rows);
  });
}

// ─── 활성 사용자 (DAU / WAU / MAU) ───

export async function fetchActiveUsers(
  days = 30
): Promise<ActionResult<ActiveUsersItem[]>> {
  return runAction(async () => {
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
  });
}

// ─── 수급 밸런스 ───

export async function fetchSupplyDemand(
  days = 30,
): Promise<ActionResult<SupplyDemandItem[]>> {
  return runAction(async () => {
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
  });
}

// ─── 빈 결과 (수요-공급 갭) ───

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export async function fetchDemandGap(
  days = 30
): Promise<ActionResult<DemandGapItem[]>> {
  return runAction(async () => {
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
  });
}

// ─── 모임별 연락 전환율 랭킹 ───

/**
 * 글 단위 `fn_admin_match_conversion`(38)은 서버에 그대로 남겨 뒀다 —
 * 모임에서 문제를 발견한 뒤 어느 글이 문제인지 파고들 때 쓰는 아래층이다.
 * 화면이 먼저 답해야 하는 것은 모임 단위라 여기서는 103 만 부른다.
 */
export async function fetchClubContactConversion(
  days = 30,
  minMatches = 3,
): Promise<ActionResult<ClubContactConversionItem[]>> {
  return runAction(async () => {
    const { from, to } = kstRange(days);
    const rows = await callRpc<{
      host_id: number;
      club_name: string | null;
      nickname: string | null;
      matches: number;
      contacted_matches: number;
      conversion: number | null;
      contacts: number;
      views: number;
      recent_matches: number;
    }>("fn_admin_club_contact_conversion", {
      p_from: from,
      p_to: to,
      p_min_matches: minMatches,
      p_limit: 50,
    });
    return rows.map((r) => ({
      hostId: r.host_id,
      clubName: r.club_name,
      nickname: r.nickname,
      matches: r.matches,
      contactedMatches: r.contacted_matches,
      conversion: r.conversion,
      contacts: r.contacts,
      views: r.views,
      recentMatches: r.recent_matches,
    }));
  });
}

// ─── 바이럴 퍼널 ───

export async function fetchViralFunnel(
  days = 30
): Promise<ActionResult<ViralStep[]>> {
  return runAction(async () => {
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
  });
}

// ─── 모임장별 문의 응답 (전수 목록 + 페이지네이션) ───

/**
 * 103 과 달리 **하한이 없다.** 저쪽은 상위 50만 보는 랭킹이라 글 1개짜리 모임을
 * 걸러야 순위가 의미를 가졌지만, 여기는 전수 목록이라 "문의 1건 받고 안 답한
 * 모임장" 을 감추면 안 된다. 대신 받은 문의 수를 열로 두고 정렬로 판단한다.
 *
 * 페이지 수를 알려면 전체 행 수가 필요한데, PostgREST 의 `count: "exact"` 는
 * RPC 에 듣지 않는다(테이블 조회 전용). 그래서 104 가 `total_count` 를 컬럼으로
 * 함께 내려보내고 여기서 첫 행에서 꺼낸다.
 */
export async function fetchHostResponseRanking({
  days = 30,
  order = "rate_asc",
  limit = 50,
  offset = 0,
}: {
  days?: number;
  order?: HostResponseOrder;
  limit?: number;
  offset?: number;
}): Promise<ActionResult<HostResponsePage>> {
  return runAction(async () => {
    const { from, to } = kstRange(days);
    const rows = await callRpc<{
      host_user_id: number;
      nickname: string | null;
      club_name: string | null;
      level: string | null;
      user_status: string;
      rooms: number;
      answered: number;
      response_rate: number | null;
      unanswered: number;
      unanswered_recent: number;
      median_minutes: number | null;
      p90_minutes: number | null;
      last_room_at: string | null;
      window_from: string;
      window_capped: boolean;
      excluded_no_host: number;
      excluded_host_initiated: number;
      total_count: number;
    }>("fn_admin_host_response_ranking", {
      p_from: from,
      p_to: to,
      p_order: order,
      p_limit: limit,
      p_offset: offset,
    });

    const head = rows[0];
    return {
      rows: rows.map((r) => ({
        hostUserId: r.host_user_id,
        nickname: r.nickname,
        clubName: r.club_name,
        level: r.level,
        userStatus: r.user_status,
        rooms: r.rooms,
        answered: r.answered,
        responseRate: r.response_rate,
        unanswered: r.unanswered,
        unansweredRecent: r.unanswered_recent,
        medianMinutes: r.median_minutes,
        p90Minutes: r.p90_minutes,
        lastRoomAt: r.last_room_at,
      })),
      total: head?.total_count ?? 0,
      meta: head
        ? {
            windowFrom: head.window_from,
            windowCapped: head.window_capped,
            excludedNoHost: head.excluded_no_host,
            excludedHostInitiated: head.excluded_host_initiated,
          }
        : null,
    };
  });
}

// ─── 재방문·방문일수·휴면 (migration 106) ───

/**
 * 주차 코호트별 7/14/30일 내 재방문.
 *
 * 정의: "N일 안에 한 번이라도" (누적). 예전 38 의 fetchRetentionCohort(정확히
 * 그날)는 정의가 달라 오독이 잦았고 2026-09-07 에 화면에서 내렸다 — 서버 함수
 * fn_admin_retention_cohort 는 남아 있지만 여기서 부르지 않는다.
 *
 * 🔴 비율의 분모는 `size` 가 아니라 **`mature_N`** 이다. 아직 N일이 안 지난
 * 기기는 그 창을 판정할 수 없어 빠진다. 분모가 0 이면 null 을 돌려주고 화면이
 * "집계 중" 으로 그린다 — 0% 로 그리면 최근 코호트가 전부 실패로 보인다.
 */
export async function fetchRevisitCohort(
  days = 90,
  group: RetentionGroup = "ALL",
): Promise<ActionResult<RevisitCohortItem[]>> {
  return runAction(async () => {
    const { from, to } = kstRange(days);
    const rows = await callRpc<{
      cohort_week: string;
      cohort_size: number;
      mature_7: number;
      revisit_7: number;
      mature_14: number;
      revisit_14: number;
      mature_30: number;
      revisit_30: number;
    }>("fn_admin_revisit_cohort", { p_from: from, p_to: to, p_group: group });
    // 분모가 0 이면 null — "0%" 와 "아직 모름" 은 다른 뜻이다.
    const pct = (n: number, base: number) =>
      base > 0 ? Math.round((n / base) * 1000) / 10 : null;
    return rows.map((r) => ({
      week: r.cohort_week,
      size: r.cohort_size,
      mature7: r.mature_7,
      mature14: r.mature_14,
      mature30: r.mature_30,
      d7: pct(r.revisit_7, r.mature_7),
      d14: pct(r.revisit_14, r.mature_14),
      d30: pct(r.revisit_30, r.mature_30),
    }));
  });
}

/**
 * 최초 실행 후 `window` 일 동안의 방문일 수 분포.
 *
 * `window` 를 인자로 둔 이유: 30일 코호트가 익기 전까지(2026-09-16 이전)
 * 7·14 로 같은 형태를 볼 수 있어야 한다. 창이 다 찬 기기만 세므로 30 을 넣으면
 * 지금은 표본이 거의 없다.
 */
export async function fetchVisitDaysDist(
  days = 90,
  group: RetentionGroup = "ALL",
  window = 30,
): Promise<ActionResult<VisitDaysItem[]>> {
  return runAction(async () => {
    const { from, to } = kstRange(days);
    const rows = await callRpc<{ visit_days: number; devices: number }>(
      "fn_admin_visit_days_dist",
      { p_from: from, p_to: to, p_group: group, p_window: window },
    );
    const total = rows.reduce((s, r) => s + r.devices, 0);
    return rows.map((r) => ({
      days: r.visit_days,
      devices: r.devices,
      share: total > 0 ? Math.round((r.devices / total) * 1000) / 10 : 0,
    }));
  });
}

/**
 * 휴면 — 마지막 활성으로부터 7·14·30일 경과(누적).
 *
 * 기간 인자가 없다. 과거를 보는 게 아니라 **지금 상태**를 보는 지표라 코호트
 * 성숙도 제약도 없다 — 오늘 바로 읽을 수 있는 유일한 축이다.
 *
 * 🔴 `rateAll` 은 "한 번 켜보고 만" 기기에 지배되어 늘 90%대로 나온다. 숫자는
 * 크지만 정보가 없다. `rateReturning`(2일 이상 방문 이력 대비)을 기본으로 보고,
 * 휴면 호스트는 비율이 아니라 **절대 수**로 본다 — 공급이 마르는 신호라서다.
 */
export async function fetchDormant(): Promise<ActionResult<DormantSummary>> {
  return runAction(async () => {
    const rows = await callRpc<{
      bucket: "D7" | "D14" | "D30";
      min_days: number;
      devices: number;
      devices_returning: number;
      members: number;
      hosts: number;
      base_devices: number;
      base_returning: number;
      base_members: number;
      base_hosts: number;
    }>("fn_admin_dormant", {});
    const pct = (n: number, base: number) =>
      base > 0 ? Math.round((n / base) * 1000) / 10 : null;
    const first = rows[0];
    return {
      rows: rows.map((r) => ({
        bucket: r.bucket,
        minDays: r.min_days,
        devices: r.devices,
        devicesReturning: r.devices_returning,
        members: r.members,
        hosts: r.hosts,
        rateAll: pct(r.devices, r.base_devices),
        rateReturning: pct(r.devices_returning, r.base_returning),
      })),
      baseDevices: first?.base_devices ?? 0,
      baseReturning: first?.base_returning ?? 0,
      baseMembers: first?.base_members ?? 0,
      baseHosts: first?.base_hosts ?? 0,
    };
  });
}

// ─── 주차별 방문일수 · 커버리지 (migration 107·108) ───

/**
 * 주차 코호트별 방문일 수 분포 (108).
 *
 * 서버가 **그 주 마지막 날까지 창이 다 찬 주만** 돌려준다. 덜 찬 주는 행이
 * 아예 없으므로 화면은 "아직 없음" 으로 그리면 된다 — 0 으로 그리면 최근 주가
 * "아무도 안 온다" 로 보인다.
 */
export async function fetchVisitDaysByCohort(
  days = 90,
  group: RetentionGroup = "ALL",
  window = 30,
): Promise<ActionResult<VisitDaysCohortWeek[]>> {
  return runAction(async () => {
    const { from, to } = kstRange(days);
    const rows = await callRpc<{
      cohort_week: string;
      cohort_size: number;
      visit_days: number;
      devices: number;
      share: number;
    }>("fn_admin_visit_days_by_cohort", {
      p_from: from,
      p_to: to,
      p_group: group,
      p_window: window,
    });
    // 주 단위로 접는다. 서버가 (주, 방문일수) 로 펴서 주므로 여기서 묶는다.
    const byWeek = new Map<string, VisitDaysCohortWeek>();
    for (const r of rows) {
      let w = byWeek.get(r.cohort_week);
      if (!w) {
        w = { week: r.cohort_week, cohortSize: r.cohort_size, bars: [] };
        byWeek.set(r.cohort_week, w);
      }
      w.bars.push({
        days: r.visit_days,
        devices: r.devices,
        share: Number(r.share),
      });
    }
    return [...byWeek.values()];
  });
}

/**
 * 코호트 커버리지 (107).
 *
 * 재방문율 표 옆에 띄워 "이 주차는 표본이 얇다" 를 화면이 스스로 말하게 한다.
 * 2026-08 초는 `fn_touch_active` 가 v1.0.8 로 막 나가던 때라 특히 낮다.
 */
export async function fetchCohortCoverage(
  days = 90,
): Promise<ActionResult<CohortCoverageItem[]>> {
  return runAction(async () => {
    const { from, to } = kstRange(days);
    const rows = await callRpc<{
      cohort_week: string;
      registered: number;
      observable: number;
      excluded: number;
      coverage: number | null;
    }>("fn_admin_cohort_coverage", { p_from: from, p_to: to });
    return rows.map((r) => ({
      week: r.cohort_week,
      registered: r.registered,
      observable: r.observable,
      excluded: r.excluded,
      coverage: r.coverage == null ? null : Number(r.coverage),
    }));
  });
}

// ─── 109 순서 퍼널 · 주간 연락 분리 ───

/**
 * 같은 기기 · 순서 · 기한(7일) 으로 센 퍼널. 38 의 fetchGuestFunnel 과 달리
 * "직전 대비" 가 100% 를 넘을 수 없다. windowFrom 은 채팅 보관 기간(90일)으로
 * 잘린 실제 시작일 — 화면이 "이 날부터만" 이라고 적는다.
 */
export async function fetchInquiryFunnel(
  days = 90,
  stepDays = 7,
): Promise<ActionResult<InquiryFunnelStep[]>> {
  return runAction(async () => {
    const { from, to } = kstRange(days);
    const rows = await callRpc<{
      step_order: number; step_name: string; devices: number;
      conv_from_prev: number | null; median_hours: number | null; window_from: string;
    }>("fn_admin_inquiry_funnel", { p_from: from, p_to: to, p_step_days: stepDays });
    return rows.map((r) => ({
      stepOrder: r.step_order, stepName: r.step_name, devices: r.devices,
      convFromPrev: r.conv_from_prev == null ? null : Number(r.conv_from_prev),
      medianHours: r.median_hours == null ? null : Number(r.median_hours),
      windowFrom: r.window_from,
    }));
  });
}

export async function fetchInquiryWeekly(days = 90): Promise<ActionResult<InquiryWeeklyItem[]>> {
  return runAction(async () => {
    const { from, to } = kstRange(days);
    const rows = await callRpc<{
      week: string; intent_devices: number; intent_members: number;
      inquirers: number; replied: number; inquiry_rooms: number;
    }>("fn_admin_inquiry_weekly", { p_from: from, p_to: to });
    return rows.map((r) => ({
      week: r.week, intentDevices: r.intent_devices, intentMembers: r.intent_members,
      inquirers: r.inquirers, replied: r.replied, inquiryRooms: r.inquiry_rooms,
    }));
  });
}

// ─── 110 지역별 매칭 가능성 ───

/** 공급은 **운동 예정일** 기준이라 from~to 를 미래로 넘겨도 된다(다가올 일정). */
export async function fetchRegionPotential(days = 30): Promise<ActionResult<RegionPotentialItem[]>> {
  return runAction(async () => {
    const { from, to } = kstRange(days);
    const rows = await callRpc<{
      region_1: string; listings: number; hosts: number; searchers: number; searches: number;
      empty_results: number; empty_rate: number | null; inquired_listings: number;
      inquiry_rate: number | null; listings_per_searcher: number | null;
    }>("fn_admin_region_match_potential", { p_from: from, p_to: to });
    const num = (v: number | null) => (v == null ? null : Number(v));
    return rows.map((r) => ({
      region: r.region_1, listings: r.listings, hosts: r.hosts, searchers: r.searchers,
      searches: r.searches, emptyResults: r.empty_results, emptyRate: num(r.empty_rate),
      inquiredListings: r.inquired_listings, inquiryRate: num(r.inquiry_rate),
      listingsPerSearcher: num(r.listings_per_searcher),
    }));
  });
}

// ─── 111 모임장 공급 유지 ───

export async function fetchHostOnboardingLag(days = 90): Promise<ActionResult<HostOnboardingLag>> {
  return runAction(async () => {
    const { from, to } = kstRange(days);
    const [r] = await callRpc<{
      hosts_registered: number; hosts_listed: number; hosts_inquired_14d: number;
      median_lag_hours: number | null; p90_lag_hours: number | null;
    }>("fn_admin_host_onboarding_lag", { p_from: from, p_to: to });
    return {
      hostsRegistered: r?.hosts_registered ?? 0, hostsListed: r?.hosts_listed ?? 0,
      hostsInquired14d: r?.hosts_inquired_14d ?? 0,
      medianLagHours: r?.median_lag_hours == null ? null : Number(r.median_lag_hours),
      p90LagHours: r?.p90_lag_hours == null ? null : Number(r.p90_lag_hours),
    };
  });
}

export async function fetchHostReregistration(days = 120): Promise<ActionResult<HostReregistrationItem[]>> {
  return runAction(async () => {
    const { from, to } = kstRange(days);
    const rows = await callRpc<{ cohort_week: string; hosts: number; reregistered_28d: number; rate: number | null }>(
      "fn_admin_host_reregistration", { p_from: from, p_to: to });
    return rows.map((r) => ({
      week: r.cohort_week, hosts: r.hosts, reregistered28d: r.reregistered_28d,
      rate: r.rate == null ? null : Number(r.rate),
    }));
  });
}

export async function fetchSupplyConcentration(days = 30, top = 10): Promise<ActionResult<SupplyConcentrationItem[]>> {
  return runAction(async () => {
    const { from, to } = kstRange(days);
    const rows = await callRpc<{
      rank: number; host_id: number; club_name: string | null; listings: number; share: number; cum_share: number;
    }>("fn_admin_supply_concentration", { p_from: from, p_to: to, p_top: top });
    return rows.map((r) => ({
      rank: r.rank, hostId: r.host_id, clubName: r.club_name, listings: r.listings,
      share: Number(r.share), cumShare: Number(r.cum_share),
    }));
  });
}

// ─── 112 경험별 · 첫검색별 재방문 ───

export async function fetchRevisitByExperience(
  days = 90, group: RetentionGroup = "ALL",
): Promise<ActionResult<RevisitByExperienceItem[]>> {
  return runAction(async () => {
    const { from, to } = kstRange(days);
    const rows = await callRpc<{ experience: Experience; rank: number; devices: number; revisited_8_30: number; rate: number | null }>(
      "fn_admin_revisit_by_experience", { p_from: from, p_to: to, p_group: group });
    return rows.map((r) => ({
      experience: r.experience, rank: r.rank, devices: r.devices,
      revisited830: r.revisited_8_30, rate: r.rate == null ? null : Number(r.rate),
    }));
  });
}

export async function fetchRevisitByFirstSearch(
  days = 90, group: RetentionGroup = "ALL",
): Promise<ActionResult<RevisitByFirstSearchItem[]>> {
  return runAction(async () => {
    const { from, to } = kstRange(days);
    const rows = await callRpc<{ first_search: "empty" | "had_results" | "no_search"; devices: number; revisited_7: number; rate: number | null }>(
      "fn_admin_revisit_by_first_search", { p_from: from, p_to: to, p_group: group });
    return rows.map((r) => ({
      firstSearch: r.first_search, devices: r.devices, revisited7: r.revisited_7,
      rate: r.rate == null ? null : Number(r.rate),
    }));
  });
}

// ─── 113 운영 신호 ───

export async function fetchCreateAbandonSteps(days = 90): Promise<ActionResult<CreateAbandonStep[]>> {
  return runAction(async () => {
    const { from, to } = kstRange(days);
    const rows = await callRpc<{ last_step: number; abandons: number; devices: number; starts: number; completes: number }>(
      "fn_admin_create_abandon_steps", { p_from: from, p_to: to });
    return rows.map((r) => ({ lastStep: r.last_step, abandons: r.abandons, devices: r.devices, starts: r.starts, completes: r.completes }));
  });
}

export async function fetchPushPermissionFunnel(days = 90): Promise<ActionResult<PushPermissionFunnel>> {
  return runAction(async () => {
    const { from, to } = kstRange(days);
    const [r] = await callRpc<{
      primed: number; accepted: number; later: number; granted: number; denied: number;
      hosts_total: number; hosts_denied_known: number; hosts_no_signal: number;
    }>("fn_admin_push_permission_funnel", { p_from: from, p_to: to });
    return {
      primed: r?.primed ?? 0, accepted: r?.accepted ?? 0, later: r?.later ?? 0,
      granted: r?.granted ?? 0, denied: r?.denied ?? 0, hostsTotal: r?.hosts_total ?? 0,
      hostsDeniedKnown: r?.hosts_denied_known ?? 0, hostsNoSignal: r?.hosts_no_signal ?? 0,
    };
  });
}

export async function fetchReplyLatencyVsReinquiry(days = 120): Promise<ActionResult<ReplyLatencyItem[]>> {
  return runAction(async () => {
    const { from, to } = kstRange(days);
    const rows = await callRpc<{ bucket: string; rank: number; rooms: number; inquirers: number; reinquired: number; rate: number | null }>(
      "fn_admin_reply_latency_vs_reinquiry", { p_from: from, p_to: to });
    return rows.map((r) => ({
      bucket: r.bucket, rank: r.rank, rooms: r.rooms, inquirers: r.inquirers,
      reinquired: r.reinquired, rate: r.rate == null ? null : Number(r.rate),
    }));
  });
}

export async function fetchPushReactivation(days = 90): Promise<ActionResult<PushReactivationItem[]>> {
  return runAction(async () => {
    const { from, to } = kstRange(days);
    const rows = await callRpc<{
      push_type: string; opens: number; devices: number; reactivated: number; retained_7d: number;
      reactivation_rate: number | null; retention_rate: number | null;
    }>("fn_admin_push_reactivation", { p_from: from, p_to: to });
    return rows.map((r) => ({
      pushType: r.push_type, opens: r.opens, devices: r.devices, reactivated: r.reactivated,
      retained7d: r.retained_7d,
      reactivationRate: r.reactivation_rate == null ? null : Number(r.reactivation_rate),
      retentionRate: r.retention_rate == null ? null : Number(r.retention_rate),
    }));
  });
}

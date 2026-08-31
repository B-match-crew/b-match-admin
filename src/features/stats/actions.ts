"use server";

import { createAdminClient } from "@/src/shared/api/supabase-admin";
import {
  runAction,
  type ActionResult,
} from "@/src/shared/lib/action-result";
import { requireAdmin } from "@/src/shared/lib/role-guard";
import { kstRange } from "@/src/shared/lib/kst-range";

/**
 * 통계 페이지 데이터 소스.
 *
 * 집계는 전부 DB(migration 27 의 fn_admin_* RPC)에서 끝낸다. PostgREST 로는
 * GROUP BY 를 못 해 행을 다 받아 세야 하는데, 기본 max-rows(1000)에 걸려
 * 조용히 잘린 통계가 나오기 때문.
 *
 * 일자 버킷은 RPC 가 KST 로 끊는다 — 서버(Vercel)는 UTC 라 JS 로컬시각을
 * 쓰면 하루가 밀린다.
 *
 * 모든 액션은 ActionResult 를 반환한다(throw 하지 않는다). Next.js 가 서버
 * 액션의 throw 를 프로덕션에서 마스킹해 원인이 화면에 닿지 못하기 때문 —
 * 자세한 배경은 src/shared/lib/action-result.ts 참고.
 */

// ─── 1~3. 일자별 유입 (다운로드 / 가입 / 비율) ───

export interface DailyAcquisitionItem {
  date: string; // yyyy-MM-dd (KST)
  guests: number;
  signups: number;
  /**
   * 일별 비율(%) = 가입수 / 게스트수 × 100.
   *
   * ⚠️ 코호트 전환율이 아니다. guest_devices 와 users 는 연결돼 있지 않아
   * 같은 사람을 추적할 수 없고, 설치일과 가입일이 다르면 분모·분자가 다른
   * 날에 잡힌다. 게스트가 0인 날은 null (0으로 나누지 않는다).
   */
  ratio: number | null;
}

export async function fetchDailyAcquisition(
  days = 30
): Promise<ActionResult<DailyAcquisitionItem[]>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();

    const { from, to } = kstRange(days);

    const { data, error } = await supabase.rpc("fn_admin_daily_acquisition", {
      p_from: from,
      p_to: to,
    });
    if (error) throw error;

    return (data ?? []).map(
      (r: { day: string; guests: number; signups: number }) => ({
        date: r.day,
        guests: r.guests,
        signups: r.signups,
        ratio:
          r.guests > 0 ? Math.round((r.signups / r.guests) * 1000) / 10 : null,
      })
    );
  });
}

// ─── 2. 누적 추이 (총 다운로드 / 총 가입 + 전일 대비 증감률) ───

export interface CumulativePoint {
  date: string; // yyyy-MM-dd (KST)
  cumGuests: number;
  cumSignups: number;
}

export interface CumulativeTrend {
  /** 전체 기간 누계 (all-time) */
  totalGuests: number;
  totalSignups: number;
  /** 기간 내 누적 곡선 — 마지막 점 = all-time 누계 */
  series: CumulativePoint[];
  /** 최근일 신규 유입 수 */
  guestsToday: number;
  signupsToday: number;
  /** 전일 대비 증감률(%) — 전일 0이면 null (0으로 나누지 않음) */
  guestsDodPct: number | null;
  signupsDodPct: number | null;
}

const dod = (today: number, yesterday: number): number | null =>
  yesterday > 0 ? Math.round(((today - yesterday) / yesterday) * 1000) / 10 : null;

export async function fetchCumulativeTrend(
  days = 30
): Promise<ActionResult<CumulativeTrend>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();

    const { from, to } = kstRange(days);

    const [dailyRes, guestTotalRes, signupTotalRes] = await Promise.all([
      supabase.rpc("fn_admin_daily_acquisition", { p_from: from, p_to: to }),
      supabase.from("guest_devices").select("id", { count: "exact", head: true }),
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .is("admin_role", null),
    ]);
    if (dailyRes.error) throw dailyRes.error;
    if (guestTotalRes.error) throw guestTotalRes.error;
    if (signupTotalRes.error) throw signupTotalRes.error;

    const daily = (dailyRes.data ?? []) as {
      day: string;
      guests: number;
      signups: number;
    }[];
    const totalGuests = guestTotalRes.count ?? 0;
    const totalSignups = signupTotalRes.count ?? 0;

    // 누적 곡선은 all-time 누계에서 역산한다: 각 날짜 종료 시점 누계 =
    // 전체 누계 - 그 날 이후에 들어온 합. 마지막 점이 정확히 all-time 과 맞는다.
    const sumAfterGuests = new Array(daily.length).fill(0);
    const sumAfterSignups = new Array(daily.length).fill(0);
    for (let i = daily.length - 2; i >= 0; i--) {
      sumAfterGuests[i] = sumAfterGuests[i + 1] + daily[i + 1].guests;
      sumAfterSignups[i] = sumAfterSignups[i + 1] + daily[i + 1].signups;
    }
    const series: CumulativePoint[] = daily.map((d, i) => ({
      date: d.day,
      cumGuests: totalGuests - sumAfterGuests[i],
      cumSignups: totalSignups - sumAfterSignups[i],
    }));

    const last = daily[daily.length - 1];
    const prev = daily[daily.length - 2];

    return {
      totalGuests,
      totalSignups,
      series,
      guestsToday: last?.guests ?? 0,
      signupsToday: last?.signups ?? 0,
      guestsDodPct: last && prev ? dod(last.guests, prev.guests) : null,
      signupsDodPct: last && prev ? dod(last.signups, prev.signups) : null,
    };
  });
}

// ─── 4. 인구통계 (성별 / 연령대 / 급수) ───

export interface DistributionItem {
  bucket: string;
  count: number;
  /** 전체 대비 비중(%) */
  share: number;
}

export interface Demographics {
  gender: DistributionItem[];
  age: DistributionItem[];
  level: DistributionItem[];
}

const GENDER_LABEL: Record<string, string> = {
  MALE: "남성",
  FEMALE: "여성",
  미입력: "미입력",
};

/** 연령대 표시 순서 — 알파벳/수치 정렬로는 원하는 순서가 안 나온다 */
const AGE_ORDER = [
  "10대 이하",
  "20대",
  "30대",
  "40대",
  "50대",
  "60대 이상",
  "미입력",
];

/** 급수 표시 순서 (level_enum 정의 순) */
const LEVEL_ORDER = ["S", "A", "B", "C", "D", "NOVICE", "BEGINNER", "미입력"];

function toItems(
  rows: { bucket: string; cnt: number }[],
  order?: string[],
  labelMap?: Record<string, string>
): DistributionItem[] {
  const total = rows.reduce((s, r) => s + r.cnt, 0);
  const items = rows.map((r) => ({
    bucket: labelMap?.[r.bucket] ?? r.bucket,
    count: r.cnt,
    share: total > 0 ? Math.round((r.cnt / total) * 1000) / 10 : 0,
  }));

  if (!order) return items.sort((a, b) => b.count - a.count);

  const rank = (b: string) => {
    const i = order.indexOf(b);
    return i === -1 ? order.length : i;
  };
  return items.sort((a, b) => rank(a.bucket) - rank(b.bucket));
}

export async function fetchDemographics(): Promise<ActionResult<Demographics>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("fn_admin_user_demographics");
    if (error) throw error;

    const rows = (data ?? []) as {
      dimension: string;
      bucket: string;
      cnt: number;
    }[];
    const pick = (d: string) => rows.filter((r) => r.dimension === d);

    return {
      gender: toItems(pick("gender"), undefined, GENDER_LABEL),
      age: toItems(pick("age"), AGE_ORDER),
      level: toItems(pick("level"), LEVEL_ORDER),
    };
  });
}

// ─── 5. 호스트 지표 ───

export interface HostStats {
  totalUsers: number;
  totalHosts: number;
  /** 실제로 모임을 개설한 호스트 수 (is_host 이지만 미개설인 경우가 있다) */
  hostsWithMatch: number;
  totalMatches: number;
  avgMatchesPerHost: number;
  /** 호스트 전환율(%) = 호스트 수 / 전체 유저 수 */
  hostConversionRate: number;
}

export async function fetchHostStats(): Promise<ActionResult<HostStats>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("fn_admin_host_stats");
    if (error) throw error;

    const r = (Array.isArray(data) ? data[0] : data) ?? {};
    const totalUsers = r.total_users ?? 0;
    const totalHosts = r.total_hosts ?? 0;

    return {
      totalUsers,
      totalHosts,
      hostsWithMatch: r.hosts_with_match ?? 0,
      totalMatches: r.total_matches ?? 0,
      avgMatchesPerHost: Number(r.avg_matches_per_host ?? 0),
      hostConversionRate:
        totalUsers > 0 ? Math.round((totalHosts / totalUsers) * 1000) / 10 : 0,
    };
  });
}

// ─── 6. 지역별 분포 ───

export interface RegionItem {
  region: string;
  matches: number;
  hosts: number;
  recruiting: number;
  /** 전체 모임 대비 비중(%) */
  share: number;
}

export async function fetchRegionDistribution(): Promise<
  ActionResult<RegionItem[]>
> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("fn_admin_region_distribution");
    if (error) throw error;

    const rows = (data ?? []) as {
      region: string;
      match_count: number;
      host_count: number;
      recruiting_count: number;
    }[];
    const total = rows.reduce((s, r) => s + r.match_count, 0);

    return rows.map((r) => ({
      region: r.region,
      matches: r.match_count,
      hosts: r.host_count,
      recruiting: r.recruiting_count,
      share: total > 0 ? Math.round((r.match_count / total) * 1000) / 10 : 0,
    }));
  });
}

// ─── 7. 신고 지표 (migration 34) ───

export interface ReportSummary {
  total: number;
  pending: number;
  reviewed: number;
  actioned: number;
  dismissed: number;
  medianHoursToResolve: number | null;
  /** 신고율(%) = 신고된 매칭 / 전체 매칭 */
  reportRate: number | null;
}

export interface ReportHostItem {
  host_id: number;
  nickname: string | null;
  name: string | null;
  user_status: string;
  reportCount: number;
  reporterCount: number;
}

export async function fetchReportStats(): Promise<
  ActionResult<{ summary: ReportSummary; hosts: ReportHostItem[] }>
> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();

    const [summaryRes, hostsRes] = await Promise.all([
      supabase.rpc("fn_admin_report_summary"),
      supabase.rpc("fn_admin_report_host_ranking", { p_limit: 20 }),
    ]);
    if (summaryRes.error) throw summaryRes.error;
    if (hostsRes.error) throw hostsRes.error;

    const s = summaryRes.data as {
      total: number;
      pending: number;
      reviewed: number;
      actioned: number;
      dismissed: number;
      median_hours_to_resolve: number | null;
      reported_matches: number;
      total_matches: number;
    };

    return {
      summary: {
        total: s.total,
        pending: s.pending,
        reviewed: s.reviewed,
        actioned: s.actioned,
        dismissed: s.dismissed,
        medianHoursToResolve: s.median_hours_to_resolve,
        reportRate:
          s.total_matches > 0
            ? Math.round((s.reported_matches / s.total_matches) * 1000) / 10
            : null,
      },
      hosts: (hostsRes.data ?? []).map(
        (r: {
          host_id: number;
          nickname: string | null;
          name: string | null;
          user_status: string;
          report_count: number;
          reporter_count: number;
        }) => ({
          host_id: r.host_id,
          nickname: r.nickname,
          name: r.name,
          user_status: r.user_status,
          reportCount: r.report_count,
          reporterCount: r.reporter_count,
        })
      ),
    };
  });
}

// ─── 8. 인기 매칭 (RPC 없이 단순 ORDER BY) ───

export interface PopularMatchItem {
  id: number;
  title: string;
  region_1: string | null;
  view_count: number;
  favorite_count: number;
}

export async function fetchPopularMatches(
  limit = 10
): Promise<ActionResult<PopularMatchItem[]>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("matches")
      .select("id, title, region_1, view_count, favorite_count")
      .is("deleted_at", null)
      .order("favorite_count", { ascending: false })
      .order("view_count", { ascending: false })
      .limit(limit);
    if (error) throw error;

    return (data ?? []) as PopularMatchItem[];
  });
}

// ─── 9. 매칭 시간대 분포 (요일 × 시간 히트맵) ───

export interface TimeCell {
  dow: number; // 0=일 … 6=토
  hour: number; // 0-23
  cnt: number;
}

export async function fetchMatchTimeDistribution(): Promise<
  ActionResult<TimeCell[]>
> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc(
      "fn_admin_match_time_distribution"
    );
    if (error) throw error;
    return (data ?? []) as TimeCell[];
  });
}

// ─── 10. 가입 경로 + 마케팅 동의율 ───

export interface SignupChannels {
  providers: DistributionItem[];
  marketingOptInRate: number | null;
  marketingOptInCount: number;
  totalUsers: number;
}

const PROVIDER_LABEL: Record<string, string> = {
  KAKAO: "카카오",
  GOOGLE: "구글",
  APPLE: "애플",
};

export async function fetchSignupChannels(): Promise<
  ActionResult<SignupChannels>
> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();

    const [chRes, totalRes, optInRes] = await Promise.all([
      supabase.rpc("fn_admin_signup_channels"),
      // 마케팅 동의율은 count filter 2번이면 되므로 RPC 없이 처리
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .is("admin_role", null),
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .is("admin_role", null)
        .eq("marketing_opt_in", true),
    ]);
    if (chRes.error) throw chRes.error;
    if (totalRes.error) throw totalRes.error;
    if (optInRes.error) throw optInRes.error;

    const rows = (chRes.data ?? []) as { provider: string; cnt: number }[];
    const total = rows.reduce((s, r) => s + r.cnt, 0);
    const totalUsers = totalRes.count ?? 0;
    const optIn = optInRes.count ?? 0;

    return {
      providers: rows.map((r) => ({
        bucket: PROVIDER_LABEL[r.provider] ?? r.provider,
        count: r.cnt,
        share: total > 0 ? Math.round((r.cnt / total) * 1000) / 10 : 0,
      })),
      marketingOptInRate:
        totalUsers > 0 ? Math.round((optIn / totalUsers) * 1000) / 10 : null,
      marketingOptInCount: optIn,
      totalUsers,
    };
  });
}

// ─── 11. 채팅 (app migration 61~87) ───

export interface ChatDailyPoint {
  day: string; // yyyy-MM-dd (KST)
  messages: number;
  rooms: number;
  senders: number;
}

/**
 * 응답 지표 (app migration 90).
 *
 * 90 이 적용되지 않은 DB 에서는 이 값이 통째로 없다 — 88 만 있어도 화면이
 * 죽지 않도록 null 로 두고, 화면은 카드를 감춘다. 0% 로 그리면 "아무도 답을
 * 안 한다" 로 읽힌다.
 */
export interface ChatResponseStats {
  /** 응답 지표를 실제로 센 시작일 (yyyy-MM-dd, KST) */
  from: string;
  /**
   * 요청한 기간이 남아 있는 기록보다 넓어 잘렸는가.
   *
   * 보관 기간이 지난 대화는 지워지므로 그 구간에서는 답장이 이미 없다. 세면
   * 응답률이 실제보다 낮게 나오고, 그 숫자로 모임장을 평가하게 된다.
   */
  windowCapped: boolean;
  /** 분모 — 창 안에서 새로 열린 방 */
  rooms: number;
  /** 문의받은 쪽이 한 번이라도 보낸 방 */
  answered: number;
  /** 미응답이지만 아직 24시간이 안 지난 방 = 판정 유보 */
  unansweredRecent: number;
  /** 첫 응답까지 걸린 시간의 중앙값(분). 답한 방이 없으면 null */
  medianMinutes: number | null;
}

export interface ChatStats {
  /**
   * 채팅 스키마가 있는 DB 인지.
   *
   * 채팅(61~87)은 앱 릴리즈가 늦어 **prod 에 아직 없다.** 없는 테이블을 읽으면
   * 화면이 통째로 에러가 되므로, 서버가 존재 여부를 판정해 내려준다.
   */
  available: boolean;
  roomsTotal: number;
  roomsActive: number;
  roomsClosed: number;
  /** 열렸지만 한 마디도 오가지 않은 방 */
  roomsEmpty: number;
  messagesTotal: number;
  messagesRanged: number;
  /** 기간 내 시스템 메시지(일정 안내·나가기 안내) */
  messagesSystem: number;
  sendersRanged: number;
  roomsRanged: number;
  /**
   * 기간 내 **새로 열린** 방 = 신규 문의 건수.
   *
   * 방은 유저가 첫 메시지를 보내는 순간 만들어지므로(app migration 82) 모임장
   * 답장 여부와 무관하다. roomsRanged(메시지가 오간 방)와 다른 값이다 —
   * 저쪽은 예전에 열린 방의 대화도 센다.
   */
  roomsCreated: number;
  daily: ChatDailyPoint[];
  /** 90 미적용 DB 에서는 null */
  response: ChatResponseStats | null;
  reportsTotal: number;
  reportsPending: number;
}

/**
 * ⚠️ 파기 대기 수는 여기 없다.
 *
 * 88 은 그 값을 이 함수와 `fn_admin_purge_status` 두 곳에서 셌는데, 보관 규칙은
 * 바뀐다 — 90일(방 단위)로 옮겨지면서 한쪽만 고쳐졌고 남은 사본은 정상 보관분을
 * "파기 지연" 으로 보고했다. 정의는 한 곳(`시스템 > 동의·파기`)에만 둔다.
 */

export async function fetchChatStats(
  days = 30
): Promise<ActionResult<ChatStats>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();
    const { from, to } = kstRange(days);

    const { data, error } = await supabase.rpc("fn_admin_chat_stats", {
      p_from: from,
      p_to: to,
    });
    if (error) throw error;

    const r = (data ?? {}) as {
      available?: boolean;
      rooms_total?: number;
      rooms_active?: number;
      rooms_closed?: number;
      rooms_empty?: number;
      messages_total?: number;
      messages_ranged?: number;
      messages_system?: number;
      senders_ranged?: number;
      rooms_ranged?: number;
      rooms_created?: number;
      daily?: ChatDailyPoint[];
      response?: {
        from: string;
        window_capped: boolean;
        rooms: number;
        answered: number;
        unanswered_recent: number;
        median_minutes: number | null;
      };
      reports?: { total: number; pending: number };
    };

    return {
      available: r.available === true,
      roomsTotal: r.rooms_total ?? 0,
      roomsActive: r.rooms_active ?? 0,
      roomsClosed: r.rooms_closed ?? 0,
      roomsEmpty: r.rooms_empty ?? 0,
      messagesTotal: r.messages_total ?? 0,
      messagesRanged: r.messages_ranged ?? 0,
      messagesSystem: r.messages_system ?? 0,
      sendersRanged: r.senders_ranged ?? 0,
      roomsRanged: r.rooms_ranged ?? 0,
      roomsCreated: r.rooms_created ?? 0,
      daily: r.daily ?? [],
      // 90 미적용이면 키 자체가 없다. 0 으로 채우지 않는다.
      response: r.response
        ? {
            from: r.response.from,
            windowCapped: r.response.window_capped,
            rooms: r.response.rooms,
            answered: r.response.answered,
            unansweredRecent: r.response.unanswered_recent,
            medianMinutes: r.response.median_minutes,
          }
        : null,
      reportsTotal: r.reports?.total ?? 0,
      reportsPending: r.reports?.pending ?? 0,
    };
  });
}

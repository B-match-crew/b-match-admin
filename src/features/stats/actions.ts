"use server";

import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { requireAdmin } from "@/src/shared/lib/role-guard";

/**
 * 통계 페이지 데이터 소스.
 *
 * 집계는 전부 DB(migration 27 의 fn_admin_* RPC)에서 끝낸다. PostgREST 로는
 * GROUP BY 를 못 해 행을 다 받아 세야 하는데, 기본 max-rows(1000)에 걸려
 * 조용히 잘린 통계가 나오기 때문.
 *
 * 일자 버킷은 RPC 가 KST 로 끊는다 — 서버(Vercel)는 UTC 라 JS 로컬시각을
 * 쓰면 하루가 밀린다.
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
): Promise<DailyAcquisitionItem[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  // KST 기준 오늘부터 역산. toLocaleDateString('en-CA') 가 yyyy-MM-dd 를 준다.
  const kstToday = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Seoul",
  });
  const to = kstToday;
  const fromDate = new Date(`${kstToday}T00:00:00Z`);
  fromDate.setUTCDate(fromDate.getUTCDate() - (days - 1));
  const from = fromDate.toISOString().slice(0, 10);

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
      ratio: r.guests > 0 ? Math.round((r.signups / r.guests) * 1000) / 10 : null,
    })
  );
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

export async function fetchDemographics(): Promise<Demographics> {
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

export async function fetchHostStats(): Promise<HostStats> {
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

export async function fetchRegionDistribution(): Promise<RegionItem[]> {
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
}

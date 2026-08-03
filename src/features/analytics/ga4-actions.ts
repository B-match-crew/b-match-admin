"use server";

import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { requireAdmin } from "@/src/shared/lib/role-guard";

/**
 * GA4 Data API 데이터 소스 — 어드민 `분석` 탭의 어트리뷰션 카드.
 *
 * 왜 `app_events` 가 아니라 GA4 인가:
 *   설치가 **어디서 왔는지**는 우리 DB 가 알 수 없다. Play Install Referrer 를
 *   읽어 `first_open` 을 소스/매체에 귀속시키는 건 Firebase SDK 뿐이다.
 *   반대로 퍼널·전환율은 `app_events` 가 정확하므로 GA4 에 묻지 않는다.
 *
 * ⚠️ 한계 (화면에도 표기한다)
 *   - GA4 는 데이터가 **24~48시간 지연**된다. 오늘 수치는 비어 있는 게 정상
 *   - 대량 쿼리는 **샘플링**될 수 있다 — 정밀 수치는 app_events 쪽을 본다
 *   - 웹/앱이 **다른 데이터 스트림**이라 같은 사람이 웹→앱으로 넘어가도 별개
 *     유저로 잡힌다
 */

/** 설정이 안 됐을 때 화면이 죽지 않도록, 데이터 대신 이 상태를 돌려준다. */
export interface Ga4Unavailable {
  configured: false;
  reason: string;
}

export interface Ga4Result<T> {
  configured: true;
  rows: T[];
  /** GA4 가 표본 추출을 했는지 — 했다면 수치를 추세로만 읽어야 한다. */
  sampled: boolean;
}

export type Ga4Response<T> = Ga4Result<T> | Ga4Unavailable;

/**
 * 서비스 계정 키를 읽는다.
 *
 * JSON 을 그대로 환경변수에 넣으면 개행 때문에 값이 잘리는 사고가 잦아
 * **base64 를 우선**으로 받는다. 원문 JSON 도 받아준다.
 */
function loadCredentials(): { client_email: string; private_key: string } | null {
  const raw = process.env.GA4_SA_KEY?.trim();
  if (!raw) return null;
  try {
    const json = raw.startsWith("{")
      ? raw
      : Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(json) as {
      client_email?: string;
      private_key?: string;
    };
    if (!parsed.client_email || !parsed.private_key) return null;
    // Vercel UI 로 붙여넣으면 개행이 \n 문자열로 들어온다.
    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key.replace(/\\n/g, "\n"),
    };
  } catch {
    return null;
  }
}

function getClient(): { client: BetaAnalyticsDataClient; property: string } | string {
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  if (!propertyId) {
    return "GA4_PROPERTY_ID 가 설정되지 않았습니다.";
  }
  const credentials = loadCredentials();
  if (!credentials) {
    return "GA4_SA_KEY 가 없거나 형식이 올바르지 않습니다.";
  }
  return {
    client: new BetaAnalyticsDataClient({ credentials }),
    property: `properties/${propertyId}`,
  };
}

/** GA4 는 상대 날짜 문자열을 받는다 — 서버 시간대에 흔들리지 않아 안전하다. */
function dateRange(days: number) {
  return { startDate: `${days}daysAgo`, endDate: "today" };
}

// ─── #8 채널별 신규 유저 ───

export interface ChannelItem {
  source: string;
  medium: string;
  newUsers: number;
  totalUsers: number;
}

export async function fetchGa4Channels(
  days = 30,
): Promise<Ga4Response<ChannelItem>> {
  await requireAdmin();
  const c = getClient();
  if (typeof c === "string") return { configured: false, reason: c };

  try {
    const [res] = await c.client.runReport({
      property: c.property,
      dateRanges: [dateRange(days)],
      // firstUser* 는 "이 유저를 처음 데려온" 채널 — 설치 귀속에 맞는 축이다.
      // session* 을 쓰면 재방문 경로가 섞여 획득 분석이 흐려진다.
      dimensions: [
        { name: "firstUserSource" },
        { name: "firstUserMedium" },
      ],
      metrics: [{ name: "newUsers" }, { name: "totalUsers" }],
      orderBys: [{ metric: { metricName: "newUsers" }, desc: true }],
      limit: 25,
    });

    return {
      configured: true,
      sampled: (res.metadata?.samplingMetadatas?.length ?? 0) > 0,
      rows: (res.rows ?? []).map((r) => ({
        source: r.dimensionValues?.[0]?.value ?? "(없음)",
        medium: r.dimensionValues?.[1]?.value ?? "(없음)",
        newUsers: Number(r.metricValues?.[0]?.value ?? 0),
        totalUsers: Number(r.metricValues?.[1]?.value ?? 0),
      })),
    };
  } catch (e) {
    return { configured: false, reason: describeError(e) };
  }
}

// ─── #9 캠페인 성과 ───

export interface CampaignItem {
  campaign: string;
  source: string;
  newUsers: number;
  /** 가입 완료 수 — 앱에서 심은 sign_up_complete 이벤트. */
  signUps: number;
}

export async function fetchGa4Campaigns(
  days = 30,
): Promise<Ga4Response<CampaignItem>> {
  await requireAdmin();
  const c = getClient();
  if (typeof c === "string") return { configured: false, reason: c };

  try {
    const [res] = await c.client.runReport({
      property: c.property,
      dateRanges: [dateRange(days)],
      dimensions: [
        { name: "firstUserCampaignName" },
        { name: "firstUserSource" },
      ],
      metrics: [
        { name: "newUsers" },
        // 이벤트별 카운트를 캠페인 축으로 쪼개려면 eventCount 에 필터를 건다.
        { name: "eventCount" },
      ],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          stringFilter: { value: "sign_up_complete" },
        },
      },
      orderBys: [{ metric: { metricName: "newUsers" }, desc: true }],
      limit: 25,
    });

    return {
      configured: true,
      sampled: (res.metadata?.samplingMetadatas?.length ?? 0) > 0,
      rows: (res.rows ?? []).map((r) => ({
        campaign: r.dimensionValues?.[0]?.value ?? "(없음)",
        source: r.dimensionValues?.[1]?.value ?? "(없음)",
        newUsers: Number(r.metricValues?.[0]?.value ?? 0),
        signUps: Number(r.metricValues?.[1]?.value ?? 0),
      })),
    };
  } catch (e) {
    return { configured: false, reason: describeError(e) };
  }
}

// ─── #10 플랫폼별 참여도 ───

export interface PlatformItem {
  platform: string;
  activeUsers: number;
  sessions: number;
  /** 세션당 평균 참여 시간(초). */
  avgEngagementSec: number;
}

export async function fetchGa4Platforms(
  days = 30,
): Promise<Ga4Response<PlatformItem>> {
  await requireAdmin();
  const c = getClient();
  if (typeof c === "string") return { configured: false, reason: c };

  try {
    const [res] = await c.client.runReport({
      property: c.property,
      dateRanges: [dateRange(days)],
      dimensions: [{ name: "platform" }],
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "userEngagementDuration" },
      ],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
    });

    return {
      configured: true,
      sampled: (res.metadata?.samplingMetadatas?.length ?? 0) > 0,
      rows: (res.rows ?? []).map((r) => {
        const sessions = Number(r.metricValues?.[1]?.value ?? 0);
        const engagement = Number(r.metricValues?.[2]?.value ?? 0);
        return {
          platform: r.dimensionValues?.[0]?.value ?? "(없음)",
          activeUsers: Number(r.metricValues?.[0]?.value ?? 0),
          sessions,
          avgEngagementSec:
            sessions > 0 ? Math.round(engagement / sessions) : 0,
        };
      }),
    };
  } catch (e) {
    return { configured: false, reason: describeError(e) };
  }
}

/**
 * 설정 실수를 화면에서 바로 알아볼 수 있게 풀어 쓴다 —
 * 가장 흔한 두 가지가 "API 미사용 설정" 과 "속성 권한 미부여" 인데,
 * 원문 메시지는 둘 다 403 이라 구분이 안 된다.
 */
function describeError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("has not been used") || msg.includes("is disabled")) {
    return "GCP 에서 Google Analytics Data API 를 사용 설정해야 합니다.";
  }
  if (msg.includes("PERMISSION_DENIED") || msg.includes("403")) {
    return "서비스 계정에 GA4 속성 뷰어 권한이 없습니다.";
  }
  return msg;
}

"use server";

import type {
  Ga4Response,
  ChannelItem,
  CampaignItem,
  PlatformItem,
} from "../model/ga4";

import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { getVercelOidcToken } from "@vercel/oidc";
import { ExternalAccountClient } from "google-auth-library";
import { runAction, type ActionResult } from "@/src/shared/lib/action-result";
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

/**
 * 인증 — **Workload Identity Federation 우선, 서비스 계정 키는 fallback.**
 *
 * 이 GCP 조직에는 `iam.disableServiceAccountKeyCreation` 조직 정책이 걸려 있어
 * 서비스 계정 키를 아예 발급할 수 없다. 그래서 키 없는 경로를 기본으로 쓴다:
 * Vercel 이 함수마다 발급하는 OIDC 토큰을 GCP STS 가 단기 액세스 토큰으로
 * 교환하고, 그 토큰으로 `ga4-reader` 서비스 계정을 가장(impersonate)한다.
 * 디스크·환경변수 어디에도 장기 비밀이 남지 않는다.
 *
 * 왜 가장(impersonation)이 필요한가: GA4 의 접근 권한은 **계정 이메일**에
 * 부여된다. WIF 주체(principal://…)는 GA4 사용자 목록에 넣을 수 없으므로
 * 서비스 계정 이메일을 거쳐야 한다.
 *
 * 키 경로는 지웠다가 되살리기 번거로워 남겨뒀다 — 조직 정책이 없는 환경이나
 * 로컬 검증에서 `GA4_SA_KEY` 만 꽂으면 그대로 동작한다.
 */

/** 서비스 계정 키(base64 또는 원문 JSON) — fallback 경로. */
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

/**
 * WIF 설정이 다 있으면 ExternalAccountClient 를, 아니면 null.
 *
 * ⚠️ 같은 제공업체를 가리키는데도 **형식이 두 가지**다. 섞으면 STS 가
 * `Invalid value for "audience"` 로 400 을 낸다:
 *   - STS 요청의 `audience`: `//iam.googleapis.com/...` (스킴 없는 전체 리소스명)
 *   - OIDC 토큰의 `aud` 클레임: `https://iam.googleapis.com/...` (GCP 가 만드는
 *     '기본 대상' 문자열 그대로)
 * 환경변수로 받지 않고 계산하는 이유도 이것 — 손으로 넣으면 반드시 하나를 틀린다.
 */
function wifAuthClient() {
  const projectNumber = process.env.GCP_PROJECT_NUMBER?.trim();
  const poolId = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID?.trim();
  const providerId = process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID?.trim();
  const serviceAccount = process.env.GCP_SERVICE_ACCOUNT_EMAIL?.trim();
  if (!projectNumber || !poolId || !providerId || !serviceAccount) return null;

  const provider =
    `iam.googleapis.com/projects/${projectNumber}` +
    `/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`;

  return ExternalAccountClient.fromJSON({
    type: "external_account",
    audience: `//${provider}`,
    // 스코프를 직접 줘야 한다. 키(credentials)를 넘길 때는 gax 가 클라이언트의
    // 기본 스코프를 붙여주지만, 만들어진 authClient 를 넘기면 그 경로를 타지
    // 않아 cloud-platform 스코프만 붙고 Data API 가
    // ACCESS_TOKEN_SCOPE_INSUFFICIENT 로 거절한다 (에러 문구는 그냥 403 이라
    // GA4 권한 문제처럼 보인다).
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url:
      `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/` +
      `${serviceAccount}:generateAccessToken`,
    subject_token_supplier: {
      getSubjectToken: () => getVercelOidcToken({ audience: `https://${provider}` }),
    },
  });
}

function getClient(): { client: BetaAnalyticsDataClient; property: string } | string {
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  if (!propertyId) {
    return "GA4_PROPERTY_ID 가 설정되지 않았습니다.";
  }

  const authClient = wifAuthClient();
  if (authClient) {
    return {
      // projectId 를 넘기지 않으면 google-gax 가 프로젝트를 알아내려고
      // Resource Manager 를 호출하는데, ga4-reader 에는 그 권한이 없어 403 이
      // 난다. 명시해서 그 호출 자체를 막는다.
      client: new BetaAnalyticsDataClient({
        authClient,
        projectId: process.env.GCP_PROJECT_ID?.trim(),
      }),
      property: `properties/${propertyId}`,
    };
  }

  const credentials = loadCredentials();
  if (credentials) {
    return {
      client: new BetaAnalyticsDataClient({ credentials }),
      property: `properties/${propertyId}`,
    };
  }

  return (
    "GCP 인증 설정이 없습니다 — Workload Identity Federation 환경변수" +
    "(GCP_PROJECT_NUMBER / GCP_WORKLOAD_IDENTITY_POOL_ID / " +
    "GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID / GCP_SERVICE_ACCOUNT_EMAIL) 또는 " +
    "GA4_SA_KEY 중 하나가 필요합니다."
  );
}

/** GA4 는 상대 날짜 문자열을 받는다 — 서버 시간대에 흔들리지 않아 안전하다. */
function dateRange(days: number) {
  return { startDate: `${days}daysAgo`, endDate: "today" };
}

// ─── #8 채널별 신규 유저 ───

export async function fetchGa4Channels(
  days = 30,
): Promise<ActionResult<Ga4Response<ChannelItem>>> {
  return runAction(async () => {
    await requireAdmin();
    const c = getClient();
    if (typeof c === "string") return { configured: false, reason: c };

    try {
      const [res] = await c.client.runReport({
        property: c.property,
        dateRanges: [dateRange(days)],
        // firstUser* 는 "이 유저를 처음 데려온" 채널 — 설치 귀속에 맞는 축이다.
        // session* 을 쓰면 재방문 경로가 섞여 획득 분석이 흐려진다.
        dimensions: [{ name: "firstUserSource" }, { name: "firstUserMedium" }],
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
  });
}

// ─── #9 캠페인 성과 ───

export async function fetchGa4Campaigns(
  days = 30,
): Promise<ActionResult<Ga4Response<CampaignItem>>> {
  return runAction(async () => {
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
  });
}

// ─── #10 플랫폼별 참여도 ───

export async function fetchGa4Platforms(
  days = 30,
): Promise<ActionResult<Ga4Response<PlatformItem>>> {
  return runAction(async () => {
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
  });
}

/**
 * 설정 실수를 화면에서 바로 알아볼 수 있게 풀어 쓴다 —
 * 가장 흔한 두 가지가 "API 미사용 설정" 과 "속성 권한 미부여" 인데,
 * 원문 메시지는 둘 다 403 이라 구분이 안 된다.
 */
function describeError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);

  // ── WIF 경로에서만 나는 실패들 (더 구체적이므로 먼저 본다) ──
  if (/oidc/i.test(msg) && /token/i.test(msg)) {
    return (
      "Vercel OIDC 토큰을 가져오지 못했습니다. Vercel 프로젝트 설정에서 " +
      "OIDC Federation 이 켜져 있는지 확인하세요 (로컬에서는 `vercel env pull` 로 " +
      "토큰을 받아야 합니다)."
    );
  }
  if (msg.includes("iam.serviceAccounts.getAccessToken")) {
    return (
      "WIF 주체에 서비스 계정 가장 권한이 없습니다 — 서비스 계정의 권한 탭에서 " +
      "해당 principal 에 `Workload Identity User` 역할을 부여하세요."
    );
  }
  if (msg.includes("iamcredentials")) {
    return "GCP 에서 IAM Service Account Credentials API 를 사용 설정해야 합니다.";
  }
  if (msg.includes("INVALID_ARGUMENT") && msg.includes("audience")) {
    return "WIF 대상(audience)이 맞지 않습니다 — 풀 제공업체의 대상 설정을 확인하세요.";
  }
  if (msg.includes("Unable to exchange") || msg.includes("invalid_grant")) {
    return (
      "STS 토큰 교환에 실패했습니다 — 제공업체의 발급기관 URL(issuer) 과 " +
      "속성 매핑(google.subject = assertion.sub) 을 확인하세요."
    );
  }

  // ── 키/WIF 공통 ──
  if (msg.includes("has not been used") || msg.includes("is disabled")) {
    return "GCP 에서 Google Analytics Data API 를 사용 설정해야 합니다.";
  }
  // 스코프 부족도 403 이라 GA4 권한 문제처럼 보인다 — 먼저 갈라낸다.
  if (
    msg.includes("ACCESS_TOKEN_SCOPE_INSUFFICIENT") ||
    msg.includes("insufficient authentication scopes")
  ) {
    return "액세스 토큰 스코프가 부족합니다 (analytics.readonly 누락) — 설정이 아니라 코드 문제입니다.";
  }
  if (msg.includes("PERMISSION_DENIED") || msg.includes("403")) {
    return "서비스 계정에 GA4 속성 뷰어 권한이 없습니다.";
  }
  // gax 가 인증 단계 실패를 이 문구로 감싸버려 원인이 안 보인다.
  if (msg.includes("Getting metadata from plugin failed")) {
    return (
      "GCP 인증에 실패했습니다 (STS 토큰 교환 또는 서비스 계정 가장 단계). " +
      "`node --env-file=.env.local scripts/verify-ga4.mjs` 로 원인을 확인하세요."
    );
  }
  return msg;
}

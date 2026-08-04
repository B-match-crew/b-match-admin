/**
 * GA4 Data API 연결 검증 — 배포 전에 설정을 로컬에서 확인한다.
 *
 * 어드민 코드(src/features/analytics/ga4-actions.ts)와 **같은 방식**으로 인증하므로
 * 여기서 통과하면 어드민에서도 통과한다. 실패하면 어느 설정 단계가 문제인지 짚어준다.
 *
 * 사용법:
 *   vercel env pull          # VERCEL_OIDC_TOKEN 포함해 .env.local 을 받아온다 (유효 12h)
 *   node --env-file=.env.local scripts/verify-ga4.mjs
 *
 * WIF 환경변수가 없으면 GA4_SA_KEY(서비스 계정 키) 경로로 자동 전환한다.
 */

import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { getVercelOidcToken } from "@vercel/oidc";
import { ExternalAccountClient } from "google-auth-library";

const propertyId = process.env.GA4_PROPERTY_ID?.trim();
if (!propertyId) fail("GA4_PROPERTY_ID 가 비어 있습니다.");
if (!/^\d+$/.test(propertyId)) {
  fail(
    `GA4_PROPERTY_ID 가 숫자가 아닙니다: "${propertyId}"\n` +
      `  → 측정 ID(G-XXXXXXXXXX)를 넣으신 것 같습니다. 관리 → 속성 설정 → 속성 ID(숫자)를 쓰세요.`,
  );
}

const client = buildClient();

console.log(`속성  properties/${propertyId}\n`);

try {
  const [res] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
    dimensions: [{ name: "platform" }],
    metrics: [{ name: "activeUsers" }, { name: "sessions" }],
  });

  console.log("✅ 연결 성공");
  const rows = res.rows ?? [];
  if (rows.length === 0) {
    console.log(
      "   최근 30일 데이터가 0건입니다 — 연결 자체는 정상입니다.\n" +
        "   (앱 배포 전이거나 GA4 반영 지연(24~48h)이면 정상)",
    );
  } else {
    for (const r of rows) {
      console.log(
        `   ${(r.dimensionValues?.[0]?.value ?? "?").padEnd(10)} ` +
          `활성 ${r.metricValues?.[0]?.value} · 세션 ${r.metricValues?.[1]?.value}`,
      );
    }
  }
} catch (e) {
  diagnose(e?.message ?? String(e));
}

function buildClient() {
  const projectNumber = process.env.GCP_PROJECT_NUMBER?.trim();
  const poolId = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID?.trim();
  const providerId = process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID?.trim();
  const serviceAccount = process.env.GCP_SERVICE_ACCOUNT_EMAIL?.trim();

  if (projectNumber && poolId && providerId && serviceAccount) {
    if (!process.env.VERCEL_OIDC_TOKEN) {
      fail(
        "VERCEL_OIDC_TOKEN 이 없습니다.\n" +
          "  → `vercel env pull` 로 .env.local 을 받은 뒤 `node --env-file=.env.local` 로 실행하세요.\n" +
          "     (토큰 유효기간은 12시간이라 만료되면 다시 pull 해야 합니다)",
      );
    }
    const audience =
      `https://iam.googleapis.com/projects/${projectNumber}` +
      `/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`;

    console.log("인증  Workload Identity Federation (키 없음)");
    console.log(`대상  ${audience}`);
    console.log(`가장  ${serviceAccount}`);

    const authClient = ExternalAccountClient.fromJSON({
      type: "external_account",
      audience,
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
      token_url: "https://sts.googleapis.com/v1/token",
      service_account_impersonation_url:
        `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/` +
        `${serviceAccount}:generateAccessToken`,
      subject_token_supplier: {
        getSubjectToken: () => getVercelOidcToken({ audience }),
      },
    });
    return new BetaAnalyticsDataClient({
      authClient,
      projectId: process.env.GCP_PROJECT_ID?.trim(),
    });
  }

  const raw = process.env.GA4_SA_KEY?.trim();
  if (!raw) {
    fail(
      "인증 설정이 없습니다.\n" +
        "  → WIF 4종(GCP_PROJECT_NUMBER / GCP_WORKLOAD_IDENTITY_POOL_ID /\n" +
        "     GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID / GCP_SERVICE_ACCOUNT_EMAIL)\n" +
        "     또는 GA4_SA_KEY 중 하나가 필요합니다.",
    );
  }
  const json = raw.startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    fail(`GA4_SA_KEY 를 해석하지 못했습니다: ${e.message}`);
  }
  if (!parsed.client_email || !parsed.private_key) {
    fail("키 JSON 에 client_email / private_key 가 없습니다.");
  }
  console.log(`인증  서비스 계정 키 (${parsed.client_email})`);
  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: parsed.client_email,
      private_key: parsed.private_key.replace(/\\n/g, "\n"),
    },
  });
}

/** 실패 원인을 설정 단계로 되짚어준다 — 원문 메시지는 대부분 그냥 403 이라 구분이 안 된다. */
function diagnose(msg) {
  if (/oidc/i.test(msg) && /token/i.test(msg)) {
    fail(
      "Vercel OIDC 토큰을 가져오지 못했습니다.\n" +
        "  → Vercel 프로젝트 설정에서 OIDC Federation 이 켜져 있는지 확인하세요.",
    );
  }
  if (msg.includes("iam.serviceAccounts.getAccessToken")) {
    fail(
      "WIF 주체에 서비스 계정 가장 권한이 없습니다.\n" +
        "  → 서비스 계정 → 권한 → 액세스 권한 부여 → principal 에 `Workload Identity User` 부여",
    );
  }
  if (msg.includes("iamcredentials")) {
    fail(
      "IAM Service Account Credentials API 가 꺼져 있습니다.\n" +
        "  → API 및 서비스 → 라이브러리 → 'IAM Service Account Credentials API' → 사용 설정",
    );
  }
  if (msg.includes("Unable to exchange") || msg.includes("invalid_grant")) {
    fail(
      "STS 토큰 교환 실패.\n" +
        "  → 제공업체의 발급기관 URL(https://oidc.vercel.com/<팀슬러그>) 과\n" +
        "     속성 매핑(google.subject = assertion.sub) 을 확인하세요.",
    );
  }
  if (msg.includes("has not been used") || msg.includes("is disabled")) {
    fail(
      "Google Analytics Data API 가 꺼져 있습니다.\n" +
        "  → API 및 서비스 → 라이브러리 → 'Google Analytics Data API' → 사용 설정",
    );
  }
  if (msg.includes("PERMISSION_DENIED") || msg.includes("403")) {
    fail(
      "서비스 계정에 GA4 속성 권한이 없습니다.\n" +
        "  → GA4 관리 → 속성 액세스 관리 → + → 서비스 계정 이메일을 '뷰어' 로 추가",
    );
  }
  if (msg.includes("NOT_FOUND") || msg.includes("404")) {
    fail(`속성 ${propertyId} 를 찾을 수 없습니다 — 속성 ID 를 확인하세요.`);
  }
  // gax 가 인증 단계 실패를 이 문구로 감싸버려 원인이 안 보인다.
  if (msg.includes("Getting metadata from plugin failed")) {
    fail(
      `인증에 실패했습니다 (STS 토큰 교환 또는 서비스 계정 가장 단계).\n` +
        `  원문: ${msg}\n` +
        "  → 확인 순서: ① 제공업체 발급기관 URL  ② 속성 매핑(google.subject = assertion.sub)\n" +
        "     ③ 서비스 계정의 `Workload Identity User` 주체 문자열(팀/프로젝트/환경)\n" +
        "     ④ VERCEL_OIDC_TOKEN 만료(12h) — `vercel env pull` 재실행",
    );
  }
  fail(msg);
}

function fail(m) {
  console.error(`❌ ${m}`);
  process.exit(1);
}

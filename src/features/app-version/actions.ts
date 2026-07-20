"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { requireAdmin } from "@/src/shared/lib/role-guard";

/**
 * 앱 버전 정책 (app_version_policy 테이블, migration 25).
 *
 * 앱은 스플래시에서 이 값을 읽어 현재 설치 버전과 비교한다:
 *   현재 < min_version         → 강제 업데이트 (스토어 이동만 가능)
 *   현재 < recommended_version → 권장 업데이트 팝업 (버전당 1회, 스킵 가능)
 *
 * 쓰기는 service_role(createAdminClient) 전용 — 앱 쪽 RLS 는 select 만 허용.
 */
export type VersionPlatform = "ios" | "android";

export interface VersionPolicyRow {
  platform: VersionPlatform;
  recommended_version: string;
  min_version: string;
  updated_at: string;
}

/** "X.Y.Z" (1~3 세그먼트 숫자) 형식 검증. 앱의 AppVersion.tryParse 와 동일 규칙. */
const VERSION_PATTERN = /^\d+(\.\d+){0,2}$/;

export async function fetchVersionPolicies(): Promise<VersionPolicyRow[]> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("app_version_policy")
    .select("platform, recommended_version, min_version, updated_at")
    .order("platform");
  if (error) throw error;
  return (data ?? []) as VersionPolicyRow[];
}

/**
 * 플랫폼별 권장/강제 버전 저장.
 * 형식이 잘못되면 앱이 fail-open 으로 게이트를 무시하므로 서버에서 선제 검증한다.
 * 강제(min) > 권장(recommended) 조합은 논리적으로 이상하므로 함께 막는다.
 */
export async function saveVersionPolicyAction(p: {
  platform: VersionPlatform;
  recommendedVersion: string;
  minVersion: string;
}) {
  const recommended = p.recommendedVersion.trim();
  const min = p.minVersion.trim();
  if (!VERSION_PATTERN.test(recommended) || !VERSION_PATTERN.test(min)) {
    throw new Error("버전은 1.0.5 같은 숫자.숫자.숫자 형식이어야 합니다");
  }
  if (compareVersions(min, recommended) > 0) {
    throw new Error("강제(최소) 버전이 권장 버전보다 높을 수 없습니다");
  }
  await requireAdmin();

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("app_version_policy")
    .update({
      recommended_version: recommended,
      min_version: min,
      updated_at: new Date().toISOString(),
    })
    .eq("platform", p.platform);
  if (error) throw error;
  revalidatePath("/app-version");
}

/** 세그먼트 단위 숫자 비교 (a > b → 1, a < b → -1, 같으면 0). */
function compareVersions(a: string, b: string): number {
  const as = a.split(".").map(Number);
  const bs = b.split(".").map(Number);
  const len = Math.max(as.length, bs.length);
  for (let i = 0; i < len; i++) {
    const x = as[i] ?? 0;
    const y = bs[i] ?? 0;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}

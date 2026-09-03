"use server";

import type {
  VersionPlatform,
  VersionPolicyRow,
} from "../model/actions";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { runAction, type ActionResult } from "@/src/shared/lib/action-result";
import { requireAdmin } from "@/src/shared/lib/role-guard";
import { rpcUpdateAppVersionPolicy } from "@/src/shared/api/rpc";

/** "X.Y.Z" (1~3 세그먼트 숫자) 형식 검증. 앱의 AppVersion.tryParse 와 동일 규칙. */
const VERSION_PATTERN = /^\d+(\.\d+){0,2}$/;

export async function fetchVersionPolicies(): Promise<
  ActionResult<VersionPolicyRow[]>
> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("app_version_policy")
      .select("platform, recommended_version, min_version, updated_at")
      .order("platform");
    if (error) throw error;
    return (data ?? []) as VersionPolicyRow[];
  });
}

/**
 * 플랫폼별 권장/강제 버전 저장.
 *
 * 실제 저장은 `fn_update_app_version_policy` RPC 가 수행한다 (migration 26).
 * 형식·순서 검증과 admin_audit_logs 기록이 DB 안에서 강제되므로, 여기 검증은
 * 네트워크 왕복 전에 사용자에게 즉시 피드백을 주기 위한 **1차 방어**일 뿐이다.
 * (RPC 는 유저 세션으로 호출된다 — is_admin() 이 auth.uid() 를 보기 때문에
 *  service_role 로 부르면 NOT_ADMIN 이 난다)
 */
export async function saveVersionPolicyAction(p: {
  platform: VersionPlatform;
  recommendedVersion: string;
  minVersion: string;
}): Promise<ActionResult<void>> {
  return runAction(async () => {
    const recommended = p.recommendedVersion.trim();
    const min = p.minVersion.trim();
    if (!VERSION_PATTERN.test(recommended) || !VERSION_PATTERN.test(min)) {
      throw new Error("버전은 1.0.5 같은 숫자.숫자.숫자 형식이어야 합니다");
    }
    if (compareVersions(min, recommended) > 0) {
      throw new Error("강제(최소) 버전이 권장 버전보다 높을 수 없습니다");
    }
    await requireAdmin();

    await rpcUpdateAppVersionPolicy({
      platform: p.platform,
      recommendedVersion: recommended,
      minVersion: min,
    });
    revalidatePath("/app-version");
  });
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

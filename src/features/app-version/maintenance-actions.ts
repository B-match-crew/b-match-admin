"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { runAction, type ActionResult } from "@/src/shared/lib/action-result";
import { requireAdmin } from "@/src/shared/lib/role-guard";
import { rpcSetMaintenance } from "@/src/shared/api/rpc";

/**
 * 서버 점검 모드 (app_status 테이블, migration 29).
 *
 * 앱은 스플래시/포그라운드 복귀/주기 폴링에서 `fn_get_app_status` 를 읽어
 * 점검 중이면 진입을 막는다("서버 점검 중입니다" 화면).
 *
 * · 점검 여부는 **서버 시각**으로 계산된다 (클라 시계 조작 방지).
 * · 예약 점검: 시작 시각이 미래면 그 시각부터 점검이 걸린다.
 * · 자동 재개(autoResume): true 면 예상 종료 시각 경과 시 자동 해제,
 *   false 면 관리자가 직접 끌 때까지 유지(점검이 길어질 때 문이 열리는 사고 방지).
 *
 * 조회는 service_role, **쓰기는 RPC**(검증 + 감사 로그를 서버에서 강제).
 */
export interface AppStatusRow {
  maintenance_enabled: boolean;
  maintenance_start_at: string | null;
  maintenance_end_at: string | null;
  auto_resume: boolean;
  updated_at: string;
}

export async function fetchAppStatus(): Promise<ActionResult<AppStatusRow>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("app_status")
      .select(
        "maintenance_enabled, maintenance_start_at, maintenance_end_at, auto_resume, updated_at"
      )
      .eq("id", 1)
      .single();
    if (error) throw error;
    return data as AppStatusRow;
  });
}

/**
 * 점검 켜기/끄기/연장.
 *
 * 여기 검증은 네트워크 왕복 전에 즉시 피드백을 주기 위한 **1차 방어**일 뿐이고,
 * 실제 강제는 RPC(P0070~P0073)가 한다.
 */
export async function setMaintenanceAction(p: {
  enabled: boolean;
  startAt?: string | null;
  endAt?: string | null;
  autoResume?: boolean;
}): Promise<ActionResult<void>> {
  return runAction(async () => {
    if (p.enabled) {
      if (!p.startAt || !p.endAt) {
        throw new Error("점검 시작/예상 종료 시각을 입력해야 합니다");
      }
      const start = new Date(p.startAt);
      const end = new Date(p.endAt);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new Error("시각 형식이 올바르지 않습니다");
      }
      if (end <= start) {
        throw new Error("예상 종료 시각은 시작 시각보다 뒤여야 합니다");
      }
      if ((p.autoResume ?? true) && end <= new Date()) {
        throw new Error("예상 종료 시각이 이미 지났습니다");
      }
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      if (end.getTime() - start.getTime() > SEVEN_DAYS_MS) {
        throw new Error("점검 기간은 최대 7일까지 설정할 수 있습니다");
      }
    }
    await requireAdmin();

    await rpcSetMaintenance({
      enabled: p.enabled,
      startAt: p.enabled ? p.startAt : null,
      endAt: p.enabled ? p.endAt : null,
      autoResume: p.autoResume ?? true,
    });
    revalidatePath("/app-version");
  });
}

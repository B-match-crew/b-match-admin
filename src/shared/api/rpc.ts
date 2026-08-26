/**
 * 라이브 관리자 RPC 래퍼.
 *
 * ⚠️ 반드시 유저 세션 클라이언트(createServerSupabase)로 호출한다.
 * 라이브 함수는 `authenticated` 에게만 grant 되고 내부에서 is_admin()/
 * is_super_admin() 를 auth.uid() 로 검사하므로, service_role(auth.uid()=null)
 * 로 부르면 grant 부재 + 내부 검사 실패로 NOT_ADMIN/NOT_SUPER_ADMIN 이 난다.
 *
 * 모든 함수는 Server Action 내부에서만 호출해야 한다.
 */

import { createServerSupabase } from "./supabase-server";

export interface SuspendUserParams {
  userId: number;
  /** ISO 8601 UTC */
  until: string;
  /** 10자 이상 */
  reason: string;
}

export async function rpcSuspendUser(p: SuspendUserParams) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("fn_admin_suspend_user", {
    p_user_id: p.userId,
    p_until: p.until,
    p_reason: p.reason,
  });
  if (error) throw error;
}

export interface BanUserParams {
  userId: number;
  reason: string;
}

export async function rpcBanUser(p: BanUserParams) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("fn_admin_ban_user", {
    p_user_id: p.userId,
    p_reason: p.reason,
  });
  if (error) throw error;
}

export interface DeleteMatchParams {
  matchId: number;
  reason: string;
}

export async function rpcDeleteMatch(p: DeleteMatchParams) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("fn_admin_delete_match", {
    p_match_id: p.matchId,
    p_reason: p.reason,
  });
  if (error) throw error;
}

export interface UpdateAppVersionPolicyParams {
  /** 'IOS' | 'ANDROID' (migration 26 에서 대문자로 정렬) */
  platform: string;
  recommendedVersion: string;
  minVersion: string;
}

/**
 * 앱 업데이트 정책 갱신 (migration 26).
 *
 * 이전에는 service_role 로 테이블을 직접 UPDATE 했으나, 버전 형식·"강제 ≤ 권장"
 * 검증이 프론트엔드에만 있었고 감사 로그도 남지 않았다. 26 부터는 RPC 가
 * 검증 + admin_audit_logs 기록을 서버에서 강제한다.
 * 에러: P0020(NOT_ADMIN) / P0060(형식) / P0061(순서) / P0062(정책 없음)
 */
export async function rpcUpdateAppVersionPolicy(
  p: UpdateAppVersionPolicyParams
) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("fn_update_app_version_policy", {
    p_platform: p.platform,
    p_recommended_version: p.recommendedVersion,
    p_min_version: p.minVersion,
  });
  if (error) throw error;
}

export interface SetMaintenanceParams {
  enabled: boolean;
  /** 점검 시작 시각 (ISO). enabled=true 면 필수 */
  startAt?: string | null;
  /** 예상 종료 시각 (ISO). enabled=true 면 필수 */
  endAt?: string | null;
  /** true 면 예상 종료 시각 경과 시 자동 해제, false 면 수동 해제만 */
  autoResume?: boolean;
}

/**
 * 서버 점검 모드 설정 (migration 29).
 *
 * 앱은 스플래시/resume/폴링에서 `fn_get_app_status` 로 점검 여부를 읽어
 * 진입을 막는다. 점검 여부는 **서버 시각**으로 계산되므로 클라 시계와 무관.
 * 에러: P0020(NOT_ADMIN) / P0070(시간 필수) / P0071(종료<시작) /
 *       P0072(종료가 과거) / P0073(7일 초과)
 */
export async function rpcSetMaintenance(p: SetMaintenanceParams) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("fn_set_maintenance", {
    p_enabled: p.enabled,
    p_start_at: p.startAt ?? null,
    p_end_at: p.endAt ?? null,
    p_auto_resume: p.autoResume ?? true,
  });
  if (error) throw error;
}

export interface CloseChatRoomParams {
  roomId: number;
  /** 10자 이상 */
  reason: string;
}

/**
 * 관리자 채팅방 강제 종료 (migration 88).
 *
 * 신고를 검토한 운영자가 쓸 수 있는 조치는 정지·영구차단뿐이었다. 둘 다 사람
 * 단위라 "이 대화만 멈춰 달라" 는 신고에는 과하다. 방을 닫으면 입력이 잠기고
 * 안내 메시지가 남는다 — 사용자가 직접 나갔을 때(74)와 같은 상태다.
 *
 * **차단이 아니다.** 상대가 다시 문의하면 새 방이 열린다. 반복되면 그때
 * 사람 단위 조치로 올라가야 한다.
 *
 * 47 과 같이 **유저 세션으로 호출**한다 — service_role 은 auth.uid() 가 null 이라
 * is_admin() 도 감사 로그의 admin_id 도 만들 수 없다.
 * 에러: P0020(NOT_ADMIN) / P0040(사유 부족) / P0080(채팅 미적용) / P0081(방 없음)
 */
export async function rpcCloseChatRoom(p: CloseChatRoomParams) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("fn_admin_close_chat_room", {
    p_room_id: p.roomId,
    p_reason: p.reason,
  });
  if (error) throw error;
}

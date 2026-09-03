"use server";

import { requireAdmin } from "@/src/shared/lib/role-guard";
import { runAction, type ActionResult } from "@/src/shared/lib/action-result";
import { createServerSupabase } from "@/src/shared/api/supabase-server";
import {
  NOTICE_BODY_MAX,
  NOTICE_TITLE_MAX,
  type BroadcastTarget,
} from "./constants";

/**
 * 긴급공지 발송 (migration 47).
 *
 * ⚠️ **되돌릴 수 없다.** 발송하면 대상 전원의 `notifications` 에 행이 생기고
 * 즉시 푸시가 나간다. 그래서 화면은 **대상 수 미리보기 + 2단계 확인**을 강제한다.
 *
 * ⚠️ 반드시 **유저 세션 클라이언트**로 호출한다. RPC 는 `authenticated` 에게만
 * grant 되고 내부에서 `is_admin()` 을 `auth.uid()` 로 검사하므로,
 * service_role(auth.uid()=null)로 부르면 FORBIDDEN 이 난다.
 *
 * 발송 규칙(탈퇴·정지 제외 등)은 서버 `fn_enqueue_notification` 이 판정한다 —
 * 여기서 다시 구현하지 않는다.
 */
/**
 * 발송 대상 수 미리보기.
 *
 * 발송 함수와 **같은 조건**(`fn_admin_broadcast_targets`)을 쓰므로
 * "미리보기 1,247명인데 실제로는 3,000명"이 나오지 않는다.
 */
export async function fetchBroadcastPreviewCount(
  target: BroadcastTarget
): Promise<ActionResult<number>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.rpc(
      "fn_admin_broadcast_preview_count",
      { p_target: target }
    );
    if (error) throw error;
    return (data as number) ?? 0;
  });
}

export interface BroadcastNoticeParams {
  title: string;
  body: string;
  target: BroadcastTarget;
  /** 선택 — 앱이 아는 값만 의미가 있다(모르면 앱이 조용히 무시). */
  deeplinkRoute?: string | null;
}

/** 발송. 생성된 알림 수를 돌려준다. */
export async function broadcastNoticeAction(
  p: BroadcastNoticeParams
): Promise<ActionResult<number>> {
  return runAction(async () => {
    // 네트워크 왕복 전 즉시 피드백을 주기 위한 1차 방어일 뿐이고,
    // 실제 강제는 RPC(P0022~P0024)가 한다.
    const title = p.title.trim();
    const body = p.body.trim();
    if (!title) throw new Error("제목을 입력해주세요");
    if (!body) throw new Error("내용을 입력해주세요");
    if (title.length > NOTICE_TITLE_MAX) {
      throw new Error(`제목은 ${NOTICE_TITLE_MAX}자 이내로 입력해주세요`);
    }
    if (body.length > NOTICE_BODY_MAX) {
      throw new Error(`내용은 ${NOTICE_BODY_MAX}자 이내로 입력해주세요`);
    }

    await requireAdmin();
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.rpc("fn_admin_broadcast_notice", {
      p_title: title,
      p_body: body,
      p_target: p.target,
      p_deeplink_route: p.deeplinkRoute || null,
      p_deeplink_params: null,
    });
    if (error) throw error;
    return (data as number) ?? 0;
  });
}

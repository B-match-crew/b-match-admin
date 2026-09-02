"use server";

import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { runAction, type ActionResult } from "@/src/shared/lib/action-result";
import { requireAdmin } from "@/src/shared/lib/role-guard";
import { kstRange } from "@/src/shared/lib/kst-range";

/**
 * 운영 상태 — 크론 실행 결과와 수집 이벤트 이름 (app migration 37 · 88).
 *
 * 이 화면이 답하는 질문은 하나다: **조용히 멈춘 것이 있는가.**
 *
 *  - 크론은 실패해도 아무 데도 알리지 않는다. 발송기(44)가 멈추면 알림이 안
 *    가고, 파기(56·63)가 멈추면 개인정보가 남고, 재확인(57)이 멈추면 법
 *    위반이다. 그런데 확인 경로가 SQL 콘솔뿐이었다.
 *  - 분석 집계(38)는 SQL 안에 앱 이벤트 **이름이 문자열로 박혀 있다.** 앱이
 *    이름을 바꾸면 에러 없이 결과가 0 이 된다 — 통계가 죽는 게 아니라 조용히
 *    거짓말을 한다. 실제로 들어오는 이름을 보면 즉시 알아챈다.
 *  - 발송기는 HTTP 응답을 아무도 읽지 않는다(pg_net 은 비동기다). 그래서
 *    "요청이 거절됐다" 는 어디에도 안 남는다. 대신 **PENDING 이 안 줄어드는
 *    것**으로 잡는다 (app migration 100, fn_admin_push_backlog).
 */

// ─── 1. 크론 상태 ───

export interface CronJob {
  jobname: string;
  schedule: string;
  active: boolean;
  lastStart: string | null;
  lastEnd: string | null;
  lastStatus: string | null;
  lastMessage: string | null;
}

export async function fetchCronHealth(): Promise<ActionResult<CronJob[]>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("fn_admin_cron_health");
    if (error) throw error;

    return (data ?? []).map(
      (r: {
        jobname: string;
        schedule: string;
        active: boolean;
        last_start: string | null;
        last_end: string | null;
        last_status: string | null;
        last_message: string | null;
      }) => ({
        jobname: r.jobname,
        schedule: r.schedule,
        active: r.active,
        lastStart: r.last_start,
        lastEnd: r.last_end,
        lastStatus: r.last_status,
        lastMessage: r.last_message,
      })
    );
  });
}

// ─── 2. 푸시 발송 적체 ───

export interface PushBacklog {
  /** 지금 PENDING 인 알림 수 */
  pendingTotal: number;
  /** 그중 기준 시간(기본 15분)보다 오래된 것 — 0 이 아니면 파이프라인이 멈춘 것 */
  pendingStale: number;
  /** 가장 오래된 PENDING 의 생성 시각 */
  oldestPending: string | null;
}

/**
 * 발송기는 5분마다 돈다(migration 44). 정상이면 PENDING 은 5분 안에
 * SENT/FAILED 로 바뀐다. **15분 넘게 PENDING 인 것이 있으면** 크론이 안
 * 돌았거나, Vault 시크릿이 빠졌거나, Edge Function 이 4xx/5xx 를 돌려준 것이다.
 *
 * 이 셋은 원인이 다 다른데 증상이 하나라 여기서는 구분하지 않는다 —
 * "멈췄다" 만 알면 크론 상태 표와 런타임 로그로 좁힐 수 있다.
 */
export async function fetchPushBacklog(): Promise<ActionResult<PushBacklog>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("fn_admin_push_backlog");
    if (error) throw error;

    // returns table(...) 이라 배열로 온다. 항상 1행이다.
    const r = (Array.isArray(data) ? data[0] : data) as
      | {
          pending_total: number;
          pending_stale: number;
          oldest_pending: string | null;
        }
      | undefined;

    return {
      pendingTotal: r?.pending_total ?? 0,
      pendingStale: r?.pending_stale ?? 0,
      oldestPending: r?.oldest_pending ?? null,
    };
  });
}

// ─── 3. 수집 이벤트 이름 ───

export interface EventName {
  eventName: string;
  cnt: number;
  users: number;
  devices: number;
  lastSeen: string;
}

export async function fetchEventNames(
  days = 30
): Promise<ActionResult<EventName[]>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();
    const { from, to } = kstRange(days);

    const { data, error } = await supabase.rpc("fn_admin_event_names", {
      p_from: from,
      p_to: to,
    });
    if (error) throw error;

    return (data ?? []).map(
      (r: {
        event_name: string;
        cnt: number;
        users: number;
        devices: number;
        last_seen: string;
      }) => ({
        eventName: r.event_name,
        cnt: r.cnt,
        users: r.users,
        devices: r.devices,
        lastSeen: r.last_seen,
      })
    );
  });
}

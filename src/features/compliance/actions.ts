"use server";

import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { runAction, type ActionResult } from "@/src/shared/lib/action-result";
import { requireAdmin } from "@/src/shared/lib/role-guard";

/**
 * 동의 이력 · 파기 현황 (app migration 52 · 55 · 56 · 57 · 88 · 91 · 92).
 *
 * 개인정보보호법 제22조 — **동의 사실의 입증책임은 사업자에게 있다.** 앱은
 * 55(필수 약관) / 52(광고성)로 append-only 이력을 남기고 있었지만, 어드민에는
 * 그것을 읽는 창이 없었다. 분쟁이 들어오면 SQL 콘솔을 여는 수밖에 없었다.
 *
 * 파기(56·63)와 2년 재확인(57)은 전부 크론이 한다. 여기서는 **대상이 쌓여
 * 있는지**만 본다 — 대상 수가 줄지 않고 늘기만 하면 크론이나 Vault 시크릿이
 * 죽은 것이고, 그 상태는 그대로 법 위반으로 이어진다.
 *
 * ⚠️ 이 화면은 파기를 실행하지 않는다. 실행 경로를 어드민에 두면 되돌릴 수
 *    없는 조작이 클릭 한 번 뒤에 놓인다.
 */

// ─── 1. 동의 요약 ───

export interface AgreementStat {
  agreement: string;
  agreed: number;
  notAgreed: number;
  versions: string[];
}

export interface MarketingStat {
  /** users.marketing_opt_in (비정규화 미러) */
  mirrorOptIn: number;
  /** marketing_consents 최신 행 기준 동의자 (정본) */
  latestAgreed: number;
  historyRows: number;
  /** 미러와 정본이 어긋난 유저 수 — 0 이 아니면 트리거를 우회한 경로가 있다 */
  mirrorMismatch: number;
  /** 최신 동의가 2년 지난 수신 동의자 (정보통신망법 §50⑧) */
  reconfirmDue: number;
  bySource: { source: string; agreed: number; revoked: number }[];
}

export interface ConsentSummary {
  members: number;
  byAgreement: AgreementStat[];
  /** 필수 4종이 모두 기록된 정회원 수 */
  fullyRecorded: number;
  bySource: { source: string; cnt: number }[];
  marketing: MarketingStat;
}

export async function fetchConsentSummary(): Promise<
  ActionResult<ConsentSummary>
> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("fn_admin_consent_summary");
    if (error) throw error;

    const r = (data ?? {}) as {
      members: number;
      by_agreement: {
        agreement: string;
        agreed: number;
        not_agreed: number;
        versions: string[];
      }[];
      fully_recorded: number;
      by_source: { source: string; cnt: number }[];
      marketing: {
        mirror_opt_in: number;
        latest_agreed: number;
        history_rows: number;
        mirror_mismatch: number;
        reconfirm_due: number;
        by_source: { source: string; agreed: number; revoked: number }[];
      };
    };

    return {
      members: r.members ?? 0,
      byAgreement: (r.by_agreement ?? []).map((a) => ({
        agreement: a.agreement,
        agreed: a.agreed,
        notAgreed: a.not_agreed,
        versions: a.versions ?? [],
      })),
      fullyRecorded: r.fully_recorded ?? 0,
      bySource: r.by_source ?? [],
      marketing: {
        mirrorOptIn: r.marketing?.mirror_opt_in ?? 0,
        latestAgreed: r.marketing?.latest_agreed ?? 0,
        historyRows: r.marketing?.history_rows ?? 0,
        mirrorMismatch: r.marketing?.mirror_mismatch ?? 0,
        reconfirmDue: r.marketing?.reconfirm_due ?? 0,
        bySource: r.marketing?.by_source ?? [],
      },
    };
  });
}

// ─── 2. 파기 대기 현황 ───

export interface PurgeStatus {
  /** 탈퇴 30일 경과 = 지금 파기돼야 할 계정 */
  accountsDue: number;
  /** 모임만 삭제된 호스트의 고아 커버 이미지 */
  coversDue: number;
  /** 탈퇴했지만 아직 30일이 안 된 계정 (대기열) */
  accountsWaiting: number;
  marketingReconfirmDue: number;
  /**
   * 파기 대상 방에 남아 있는 채팅 메시지. 채팅 미적용 DB 에서는 null.
   *
   * 기준이 바뀌었다(app migration 91, 약관 2026-08-31) — 예전에는 "30일 지난
   * 메시지"였고 지금은 **"마지막 대화로부터 90일이 지난 방"의 메시지 전부**다.
   * 최근에 대화한 방은 아무리 옛 메시지라도 대상이 아니다.
   */
  chatMessagesDue: number | null;
  /** 위 메시지들이 속한 방 수. 실제 삭제 단위는 방이다. */
  chatRoomsDue: number | null;
  /** 처리 완료 1년 경과 채팅 신고 (app migration 92) */
  chatReportsDue: number | null;
  /** 처리 완료 1년 경과 매칭 신고 (app migration 92) */
  matchReportsDue: number;
}

export async function fetchPurgeStatus(): Promise<ActionResult<PurgeStatus>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("fn_admin_purge_status");
    if (error) throw error;

    const r = (data ?? {}) as {
      accounts_due: number;
      covers_due: number;
      accounts_waiting: number;
      marketing_reconfirm_due: number;
      chat_messages_due: number | null;
      chat_rooms_due: number | null;
      chat_reports_due: number | null;
      match_reports_due: number;
    };

    return {
      accountsDue: r.accounts_due ?? 0,
      coversDue: r.covers_due ?? 0,
      accountsWaiting: r.accounts_waiting ?? 0,
      marketingReconfirmDue: r.marketing_reconfirm_due ?? 0,
      chatMessagesDue: r.chat_messages_due ?? null,
      chatRoomsDue: r.chat_rooms_due ?? null,
      chatReportsDue: r.chat_reports_due ?? null,
      matchReportsDue: r.match_reports_due ?? 0,
    };
  });
}

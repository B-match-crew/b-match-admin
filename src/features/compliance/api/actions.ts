"use server";

import type {
  ConsentSummary,
  PurgeStatus,
} from "../model/actions";

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

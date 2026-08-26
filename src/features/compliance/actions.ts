"use server";

import { createAdminClient } from "@/src/shared/api/supabase-admin";
import { runAction, type ActionResult } from "@/src/shared/lib/action-result";
import { requireAdmin } from "@/src/shared/lib/role-guard";

/**
 * 동의 이력 · 파기 현황 (app migration 52 · 55 · 56 · 57 · 88).
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
  /** 30일 지난 채팅 메시지. 채팅 미적용 DB 에서는 null */
  chatMessagesDue: number | null;
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
    };

    return {
      accountsDue: r.accounts_due ?? 0,
      coversDue: r.covers_due ?? 0,
      accountsWaiting: r.accounts_waiting ?? 0,
      marketingReconfirmDue: r.marketing_reconfirm_due ?? 0,
      chatMessagesDue: r.chat_messages_due ?? null,
    };
  });
}

// ─── 3. 유저 한 명의 동의 이력 ───

export interface AgreementRecord {
  id: number;
  agreement: string;
  agreed: boolean;
  version: string | null;
  source: string;
  createdAt: string;
}

export interface MarketingRecord {
  id: number;
  agreed: boolean;
  source: string;
  createdAt: string;
}

export interface UserConsents {
  agreements: AgreementRecord[];
  marketing: MarketingRecord[];
  /** users.marketing_opt_in — 정본(marketing 최신 행)과 대조용 */
  mirrorOptIn: boolean;
}

/**
 * 유저 상세의 "동의 이력" 탭.
 *
 * 집계가 아니라 한 사람의 행을 시간순으로 그대로 보여준다 — 분쟁 대응은
 * 요약이 아니라 **언제 무엇에 동의했는지**를 요구한다. 이력은 append-only 라
 * 최신 행이 현재 상태이고, 그 앞의 행들이 곧 증적이다.
 */
export async function fetchUserConsents(
  userId: number
): Promise<ActionResult<UserConsents>> {
  return runAction(async () => {
    await requireAdmin();
    const supabase = createAdminClient();

    const [agreementRes, marketingRes, userRes] = await Promise.all([
      supabase
        .from("user_agreements")
        .select("id, agreement, agreed, version, source, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("marketing_consents")
        .select("id, agreed, source, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("users")
        .select("marketing_opt_in")
        .eq("id", userId)
        .single(),
    ]);
    if (agreementRes.error) throw agreementRes.error;
    if (marketingRes.error) throw marketingRes.error;
    if (userRes.error) throw userRes.error;

    return {
      agreements: (agreementRes.data ?? []).map((a) => ({
        id: a.id as number,
        agreement: a.agreement as string,
        agreed: Boolean(a.agreed),
        version: (a.version ?? null) as string | null,
        source: a.source as string,
        createdAt: a.created_at as string,
      })),
      marketing: (marketingRes.data ?? []).map((m) => ({
        id: m.id as number,
        agreed: Boolean(m.agreed),
        source: m.source as string,
        createdAt: m.created_at as string,
      })),
      mirrorOptIn: Boolean(userRes.data?.marketing_opt_in),
    };
  });
}

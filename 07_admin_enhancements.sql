-- =============================================================================
-- B-Match Admin Enhancements Patch
-- 실행: Supabase Dashboard > SQL Editor
--
-- 신규 추가만 (기존 테이블/함수/트리거/RLS 변경 없음 = 앱 영향 없음)
--   1) fn_admin_unblind_comment  — 댓글 블라인드 해제 RPC
--   2) report_target_summary     — 신고 누적 집계 뷰
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. fn_admin_unblind_comment
--    fn_admin_unblind_post 와 동일 패턴.
--    comments.is_blind = false + 해당 PENDING 신고를 RESOLVED + audit log
-- ---------------------------------------------------------------------------
create or replace function public.fn_admin_unblind_comment(
  p_comment_id bigint,
  p_reason     text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_ADMIN' using errcode = '42501';
  end if;

  if char_length(coalesce(p_reason, '')) < 10 then
    raise exception 'REASON_TOO_SHORT' using errcode = 'P0040';
  end if;

  -- 댓글 블라인드 해제
  update public.comments
     set is_blind = false, updated_at = now()
   where id = p_comment_id;

  -- 해당 댓글의 PENDING 신고를 RESOLVED 로 전환 (재집계 차단)
  update public.reports
     set status = 'RESOLVED'
   where target_type = 'COMMENT'
     and target_id = p_comment_id
     and status = 'PENDING';

  -- 감사 로그
  insert into public.admin_audit_logs (admin_id, action_type, target_type, target_id, reason)
  values (auth.uid(), 'UNBLIND_COMMENT', 'COMMENT', p_comment_id::text, p_reason);
end;
$$;

grant execute on function public.fn_admin_unblind_comment(bigint, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. report_target_summary (신고 누적 집계 뷰)
--    관리자 페이지에서 target_type + target_id 별 신고 수를 효율적으로 조회.
--    기존 테이블 구조 변경 없음. 읽기 전용 뷰.
-- ---------------------------------------------------------------------------
create or replace view public.report_target_summary as
select
  target_type,
  target_id,
  count(*)                                        as total_count,
  count(*) filter (where status = 'PENDING')      as pending_count,
  count(*) filter (where status = 'RESOLVED')     as resolved_count,
  count(*) filter (where status = 'REJECTED')     as rejected_count,
  count(distinct reporter_id)                     as unique_reporters,
  min(created_at)                                 as first_reported_at,
  max(created_at)                                 as last_reported_at
from public.reports
group by target_type, target_id;

-- RLS: reports 테이블의 RLS 정책이 뷰에도 자동 적용됨.
-- 관리자(is_admin())만 reports 전체 조회 가능하므로 뷰도 관리자 전용.

commit;

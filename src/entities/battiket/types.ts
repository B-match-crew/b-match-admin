// v3.0 스키마 기준: public.badticket_events + app_config (배티켓 관련 키)
export type BadticketReason =
  | 'EVAL_GREAT'
  | 'EVAL_NORMAL'
  | 'EVAL_BAD'
  | 'PENALTY_UNPAID'
  | 'PENALTY_GIVEUP'
  | 'PENALTY_NOSHOW'
  | 'PENALTY_HOST_CANCEL'
  | 'PENALTY_HOST_NEGLECT'
  | 'ADMIN_ADJUST';

export interface BadticketEvent {
  id: number;
  user_id: string;
  delta: number;
  reason: BadticketReason;
  reference_match_id: number | null;
  admin_note: string | null;
  is_applied: boolean;
  created_at: string;
  // joined
  user?: { nickname: string; real_name: string | null } | null;
}

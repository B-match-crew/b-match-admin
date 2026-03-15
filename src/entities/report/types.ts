export interface Report {
  id: string;
  reporter_id: string;
  target_type: string; // '게시글' | '댓글' | '사용자'
  target_id: string;
  reason: string;
  detail: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
  // joined fields
  reporter_nickname?: string;
  // 대상 정보 (target_type에 따라 다름)
  target_label?: string;
}

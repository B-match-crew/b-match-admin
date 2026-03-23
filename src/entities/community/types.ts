// 커뮤니티 게시글/댓글 블라인드 관리 타입

export type BlindStatus = "VISIBLE" | "BLINDED" | "DELETED";
export type ContentType = "POST" | "COMMENT";

export interface CommunityPost {
  id: number;
  author_id: string;
  title: string;
  content: string;
  blind_status: BlindStatus;
  report_count: number;
  created_at: string;
  updated_at: string;
  // joined
  author?: { nickname: string; real_name: string | null } | null;
}

export interface CommunityComment {
  id: number;
  post_id: number;
  author_id: string;
  content: string;
  blind_status: BlindStatus;
  report_count: number;
  created_at: string;
  // joined
  author?: { nickname: string; real_name: string | null } | null;
}

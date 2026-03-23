// v3.0 스키마 기준: public.posts, public.comments

export type ContentType = "POST" | "COMMENT";

export interface CommunityPost {
  id: string;
  author_id: string;
  title: string;
  content: string;
  like_count: number;
  comment_count: number;
  is_blind: boolean;
  is_deleted: boolean;
  report_count?: number; // reports 테이블에서 집계
  created_at: string;
  updated_at: string;
  // joined
  author?: { nickname: string; real_name: string | null } | null;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  like_count: number;
  is_blind: boolean;
  is_deleted: boolean;
  report_count?: number; // reports 테이블에서 집계
  created_at: string;
  updated_at: string;
  // joined
  author?: { nickname: string; real_name: string | null } | null;
}

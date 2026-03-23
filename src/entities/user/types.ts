// v3.0 스키마 기준: public.users
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';
export type UserLevel = 'S' | 'A' | 'B' | 'C' | 'D' | 'NOVICE' | 'BEGINNER';
export type Gender = 'MALE' | 'FEMALE';

export interface User {
  id: string;
  auth_id: string;
  social_provider: string;
  real_name: string | null;
  nickname: string | null;
  phone: string | null;
  gender: Gender | null;
  birth_year: number | null;
  level: UserLevel;
  profile_image_url: string | null;
  is_host: boolean;
  status: UserStatus;
  badticket_score: number;
  intro_message: string | null;
  marketing_opt_in: boolean;
  terms_agreed_at: string | null;
  ci_hash: string | null;
  di_hash: string | null;
  suspended_until: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // 레거시 중복 컬럼
  age: string | null;
  skill_level: string | null;
  self_introduction: string | null;
  phone_number: string | null;
  name: string | null;
  // joined
  host_profiles?: HostProfile | null;
}

export interface HostProfile {
  id: string;
  user_id: string;
  club_name: string;
  cover_image_url: string | null;
  male_ratio: number;
  female_ratio: number;
  age_distribution: Record<string, number> | null;
  skill_counts: Record<string, number> | null;
  representative_images: string[] | null;
  description: string | null;
  settlement_account_id: string | null;
  created_at: string;
  updated_at: string;
}

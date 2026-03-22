// v3.0 스키마 기준: public.users
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';
export type UserLevel = 'S' | 'A' | 'B' | 'C' | 'D' | 'NOVICE' | 'BEGINNER';
export type Gender = 'MALE' | 'FEMALE';

export interface User {
  id: string;
  social_provider: string;
  real_name: string | null;
  nickname: string | null;
  phone: string | null;
  gender: Gender | null;
  birth_year: number | null;
  level: UserLevel;
  is_host: boolean;
  status: UserStatus;
  badticket_score: number;
  intro_message: string | null;
  marketing_opt_in: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  // joined
  host_profiles?: HostProfile | null;
}

export interface HostProfile {
  id: number;
  user_id: string;
  club_name: string;
  cover_image_url: string | null;
  gender_ratio_male: number;
  gender_ratio_female: number;
  age_distribution: Record<string, number> | null;
  level_distribution: Record<string, number> | null;
  settlement_bank_name: string | null;
  settlement_account_no: string | null;
}

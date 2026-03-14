export interface User {
  id: string;
  auth_id: string | null;
  name: string | null;
  real_name: string;
  nickname: string;
  gender: string;
  age: string;
  skill_level: string;
  is_host: boolean;
  profile_image_url: string | null;
  battiket_score: number;
  self_introduction: string | null;
  phone_number: string | null;
  fcm_token: string | null;
  provider: string | null;
  is_active: boolean;
  participation_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminAdjustment {
  id: string;
  user_id: string;
  admin_id: string;
  score_change: number;
  reason: string;
  created_at: string;
}

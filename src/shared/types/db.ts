/**
 * B-Match v4.6.4 스키마 타입
 * 출처: admin_db_spec.md §2~§3
 */

// ─── ENUM ───
export type UserStatus = "ACTIVE" | "SUSPENDED" | "BANNED";
export type Gender = "MALE" | "FEMALE";
export type Level = "S" | "A" | "B" | "C" | "D" | "NOVICE" | "BEGINNER";
export type AdminRole = "SUPER_ADMIN" | "MANAGER";
export type GenderCondition = "MALE_ONLY" | "FEMALE_ONLY" | "ALL";
export type MatchStatus = "RECRUITING" | "CLOSED" | "ENDED";
export type ContactType = "URL" | "PHONE";
export type ReportTargetType = "POST" | "COMMENT";
export type ReportStatus = "PENDING" | "RESOLVED" | "REJECTED";
export type NotificationType =
  | "COMMUNITY_COMMENT"
  | "COMMUNITY_REPLY"
  | "COMMUNITY_BLIND"
  | "SYSTEM_SUSPEND"
  | "ADMIN_NOTICE";
export type DeviceOs = "IOS" | "ANDROID";

// ─── 테이블 타입 ───

export interface DbUser {
  id: string;
  name: string | null;
  nickname: string | null;
  phone_number: string | null;
  gender: Gender | null;
  birth_year: number | null;
  level: Level | null;
  is_host: boolean;
  user_status: UserStatus;
  ci_hash: string | null;
  marketing_opt_in: boolean;
  is_deleted: boolean;
  admin_role: AdminRole | null;
  suspended_until: string | null;
  suspended_reason: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbHostProfile {
  id: number;
  user_id: string;
  club_name: string;
  description: string | null;
  cover_image_url: string | null;
  min_level_required: Level;
  gender_ratio_male: number;
  gender_ratio_female: number;
  age_distribution: Record<string, number>;
  level_distribution: Record<string, number>;
  is_deleted: boolean;
}

export interface FeeConfig {
  fee: {
    type: "NONE" | "CASH" | "COCK" | "CASH_COCK";
    cash_male?: number;
    cash_female?: number;
    cock_male?: number;
    cock_female?: number;
  };
  facility_fee: {
    enabled: boolean;
    amount?: number;
    payment?: "ON_SITE";
  };
  designated_cock: {
    brand?: string;
    retail_enabled: boolean;
    retail_price?: number;
  };
}

export interface DbMatch {
  id: number;
  host_id: string;
  title: string;
  start_time: string;
  end_time: string;
  location_name: string;
  location_detail: string | null;
  address: string;
  latitude: number;
  longitude: number;
  region_1: string;
  region_2: string;
  capacity: number | null;
  gender_condition: GenderCondition;
  age_min_year: number | null;
  age_max_year: number | null;
  allowed_levels: Level[];
  beginner_friendly: boolean;
  fee_config: FeeConfig;
  facilities: {
    parking?: boolean;
    shower?: boolean;
    water?: boolean;
    rental?: boolean;
  };
  description: string | null;
  contact_type: ContactType;
  contact_value: string;
  status: MatchStatus;
  is_manually_closed: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbPost {
  id: number;
  author_id: string;
  title: string;
  content: string;
  comment_count: number;
  is_blind: boolean;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbComment {
  id: number;
  post_id: number;
  author_id: string;
  parent_id: number | null;
  content: string;
  is_blind: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbReport {
  id: number;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: number;
  status: ReportStatus;
  created_at: string;
}

export interface DbNotification {
  id: number;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  deeplink_route: string | null;
  deeplink_params: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface DbFcmToken {
  id: number;
  user_id: string;
  token: string;
  device_os: DeviceOs;
  created_at: string;
  updated_at: string;
}

export interface DbPermanentBlacklist {
  ci_hash: string;
  user_id: string | null;
  reason: string;
  created_at: string;
}

export type AuditActionType =
  | "SUSPEND_USER"
  | "BAN_USER"
  | "DELETE_MATCH"
  | "BLIND_POST"
  | "UNBLIND_POST"
  | "SEND_PUSH"
  | "REJECT_REPORT";

export interface DbAdminAuditLog {
  id: number;
  admin_id: string;
  action_type: AuditActionType | string;
  target_type: string | null;
  target_id: string | null;
  detail: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
}

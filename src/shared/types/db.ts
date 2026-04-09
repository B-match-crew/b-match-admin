/**
 * B-Match v4.6.11 스키마 타입
 * 출처: admin_db_spec.md §2~§3 + admin_v4_6_11_patch.md
 *
 * v4.6.11 변경:
 * - Level 에서 'S' 제거
 * - host_profiles.min_level_required 컬럼 제거
 * - level_distribution: 6키 (S 제거)
 * - age_distribution: 5키 (10대 키 없음, 합산 100)
 */

// ─── ENUM ───
export type UserStatus = "ACTIVE" | "SUSPENDED" | "BANNED";
export type Gender = "MALE" | "FEMALE";
export type Level = "A" | "B" | "C" | "D" | "NOVICE" | "BEGINNER";
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

/**
 * 연령 분포 (v4.6.11): 5개 키, 합산 100
 * - DB CHECK 제약: '20s' + '30s' + '40s' + '50s' + '60s_plus' = 100
 * - 10대는 만 14세 미만 차단 정책으로 키 자체 없음
 */
export interface AgeDistribution {
  "20s": number;
  "30s": number;
  "40s": number;
  "50s": number;
  "60s_plus": number;
}

/**
 * 급수 분포 (v4.6.11): 6개 키 (S 제거)
 */
export interface LevelDistribution {
  A: number;
  B: number;
  C: number;
  D: number;
  novice: number;
  beginner: number;
}

export interface DbHostProfile {
  id: number;
  user_id: string;
  club_name: string;
  description: string | null;
  cover_image_url: string | null;
  // v4.6.11: min_level_required 컬럼 제거됨
  gender_ratio_male: number;
  gender_ratio_female: number;
  age_distribution: AgeDistribution;
  level_distribution: LevelDistribution;
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

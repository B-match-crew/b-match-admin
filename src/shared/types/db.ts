/**
 * B-Match 라이브 DB 스키마 타입 (post-migration 14)
 * 출처: supabase/SCHEMA.md (live ground truth)
 *
 * 핵심 변경 (migration 09~14):
 * - 모든 PK bigint. users.id 도 bigint (number). auth 연결은 users.auth_user_id (uuid)
 * - soft delete 통일: deleted_at IS NULL = 살아있음 (is_deleted 컬럼 삭제됨)
 * - 커뮤니티(posts/comments/reports) DROP
 * - Level 에서 'S' 제거, host_profiles.min_level_required 는 라이브에 존재
 * - matches.additional_info 추가 (migration 12)
 */

// ─── ENUM (Postgres enum 아님, VARCHAR + CHECK) ───
export type UserStatus = "ACTIVE" | "SUSPENDED" | "BANNED";
export type Gender = "MALE" | "FEMALE";
export type Level = "A" | "B" | "C" | "D" | "NOVICE" | "BEGINNER";
export type AdminRole = "SUPER_ADMIN" | "MANAGER";
export type Provider = "KAKAO" | "GOOGLE" | "APPLE";
export type GenderCondition = "MALE_ONLY" | "FEMALE_ONLY" | "ALL";
export type MatchStatus = "RECRUITING" | "CLOSED" | "ENDED";
export type ContactType = "URL" | "PHONE";
export type NotificationType =
  | "COMMUNITY_COMMENT"
  | "COMMUNITY_REPLY"
  | "COMMUNITY_BLIND"
  | "SYSTEM_SUSPEND"
  | "ADMIN_NOTICE";
export type DeviceOs = "IOS" | "ANDROID";

// ─── 테이블 타입 ───

export interface DbUser {
  id: number; // bigint (Spring Long 호환)
  auth_user_id: string | null; // uuid, auth.users 연결 (UNIQUE)
  email: string;
  /** 관리자(이메일 가입) 계정은 트리거가 'KAKAO' 더미값을 박음 — 가입경로 통계 시 admin_role IS NOT NULL 제외 */
  provider: Provider;
  provider_id: string;
  name: string | null;
  nickname: string | null;
  phone_number: string | null;
  gender: Gender | null;
  birth_year: number | null;
  level: Level | null;
  is_host: boolean;
  ci_hash: string | null;
  marketing_opt_in: boolean;
  last_login_at: string | null;
  user_status: UserStatus;
  admin_role: AdminRole | null;
  suspended_until: string | null;
  suspended_reason: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null; // NULL = 살아있음
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
  user_id: number;
  club_name: string;
  description: string | null;
  cover_image_url: string | null;
  min_level_required: Level; // 라이브에 존재 (varchar(10), default 'BEGINNER')
  gender_ratio_male: number;
  gender_ratio_female: number;
  age_distribution: AgeDistribution;
  level_distribution: LevelDistribution;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** fee_config JSON — 앱(Flutter)에서 camelCase로 저장, spec은 snake_case */
export interface FeeConfig {
  fee: {
    type: "NONE" | "CASH" | "COCK" | "CASH_COCK";
    cash_male?: number;
    cash_female?: number;
    cock_male?: number;
    cock_female?: number;
  };
  // snake_case (spec)
  facility_fee?: {
    enabled: boolean;
    amount?: number;
    payment?: "ON_SITE";
  };
  designated_cock?: {
    brand?: string;
    retail_enabled: boolean;
    retail_price?: number;
  };
  // camelCase (앱 실제 저장)
  facilityFee?: {
    enabled: boolean;
    amount?: number;
    payment?: "ON_SITE";
  };
  designatedCock?: {
    brand?: string;
    retail_enabled?: boolean;
    retail_price?: number;
  };
}

/** fee_config에서 camelCase / snake_case 키 모두 안전하게 접근 */
export function normalizeFeeConfig(fc: FeeConfig) {
  return {
    fee: fc.fee ?? { type: "NONE" as const },
    facilityFee: fc.facility_fee ?? fc.facilityFee ?? { enabled: false },
    designatedCock: fc.designated_cock ?? fc.designatedCock ?? { retail_enabled: false },
  };
}

export interface DbMatch {
  id: number;
  host_id: number;
  title: string;
  start_time: string;
  end_time: string;
  location_name: string;
  location_detail: string | null;
  address: string;
  latitude: number;
  longitude: number;
  region_1: string;
  region_2: string | null;
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
  additional_info: string | null; // migration 12, varchar(1000)
  contact_type: ContactType;
  contact_value: string;
  status: MatchStatus;
  is_manually_closed: boolean;
  view_count: number; // migration 24, 상세 진입 시 +1 (호스트 본인 제외)
  favorite_count: number; // migration 31, match_favorites 트리거가 동기화
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ─── 신고/차단 (migration 21) ───

export type ReportStatus = "PENDING" | "REVIEWED" | "ACTIONED" | "DISMISSED";

/** 매칭글 신고. status 흐름: PENDING → REVIEWED → ACTIONED/DISMISSED */
export interface DbMatchReport {
  id: number;
  reporter_id: number;
  match_id: number;
  host_id: number; // 비정규화: 관리자 집계 편의
  reason: string; // varchar(50)
  detail: string | null; // varchar(500)
  status: ReportStatus;
  created_at: string;
  updated_at: string;
}

/** 모임장 차단 (사용자 간, 관리자 운영 대상 아님 — 참고용 타입) */
export interface DbUserBlock {
  id: number;
  blocker_id: number;
  blocked_id: number;
  created_at: string;
}

// ─── dormant 테이블 (MVP 미사용, 테이블만 보존) ───

export interface DbNotification {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  body: string;
  deeplink_route: string | null;
  deeplink_params: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DbFcmToken {
  id: number;
  user_id: number;
  token: string;
  device_os: DeviceOs;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DbPermanentBlacklist {
  id: number;
  ci_hash: string;
  user_id: number | null;
  reason: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// 라이브 RPC 가 실제 저장하는 값 (fn_admin_suspend_user='SUSPEND',
// fn_admin_ban_user='BAN', fn_admin_delete_match='DELETE_MATCH').
// 'UNSUSPEND' 는 라이브 RPC 가 없어 관리자 페이지가 직접 INSERT 하는 값.
// action_type 컬럼은 varchar(100) free text — DB 제약 없음 (UI 힌트용)
export type AuditActionType = "SUSPEND" | "BAN" | "DELETE_MATCH" | "UNSUSPEND";

export interface DbAdminAuditLog {
  id: number;
  admin_id: number; // bigint FK → users.id
  action_type: AuditActionType | string;
  target_type: string | null;
  target_id: string | null; // varchar(50) text
  detail: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * B-Match 라이브 DB 스키마 타입
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
// migration 32 에서 'S' 재허용. 단 S 는 users.level(개인 급수) 전용 —
// matches.allowed_levels 에는 들어가지 않는다(구버전 앱 파싱 실패 방지).
export type Level = "S" | "A" | "B" | "C" | "D" | "NOVICE" | "BEGINNER";
export type AdminRole = "SUPER_ADMIN" | "MANAGER";
export type Provider = "KAKAO" | "GOOGLE" | "APPLE";
export type GenderCondition = "MALE_ONLY" | "FEMALE_ONLY" | "ALL";
export type MatchStatus = "RECRUITING" | "CLOSED" | "ENDED";
export type ContactType = "URL" | "PHONE";
/**
 * notifications.type 의 CHECK 값.
 *
 * COMMUNITY_* 는 커뮤니티가 제거되면서 migration 26 이 CHECK 에서 뺐다 —
 * 딥링크가 끊긴 죽은 값이라 기존 행과 함께 정리됐다. 새 타입을 추가하려면
 * DB CHECK 를 먼저 확장해야 한다.
 */
export type NotificationType = "SYSTEM_SUSPEND" | "ADMIN_NOTICE";
export type DeviceOs = "IOS" | "ANDROID";

/** notifications.send_status (migration 43). NULL = 43 이전에 만들어진 행 */
export type SendStatus = "PENDING" | "SENDING" | "SENT" | "FAILED" | "SKIPPED";

/** 차단이 일어난 경로 (migration 67). 어드민 랭킹이 이 값으로 갈린다 */
export type BlockSource = "MATCH" | "CHAT";

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
  contact_type: ContactType | null; // migration 30, nullable (구버전 앱 미전송)
  contact_value: string | null; // migration 30, text
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

/** 모임장 차단 (사용자 간). 어드민은 랭킹으로만 본다 */
export interface DbUserBlock {
  id: number;
  blocker_id: number;
  blocked_id: number;
  /** migration 67. 매칭 차단과 채팅 차단이 같은 테이블을 쓰므로 출처로 가른다 */
  source: BlockSource;
  created_at: string;
}

// ─── 알림 / 푸시 (migration 41~54 · 64 — **운영 중**) ───

/**
 * 알림.
 *
 * 오래 "dormant" 로 적혀 있었지만 **푸시는 2026-08-12 서울 컷오버로 운영에
 * 올라갔다.** 발송 경로는 fn_enqueue_notification → 이 테이블 →
 * fn_dispatch_push → Edge notify-push 다.
 */
export interface DbNotification {
  id: number;
  user_id: number;
  type: NotificationType;
  /** notification_categories.code (49). 발송 규칙·수신 토글 판정의 기준 */
  category: string | null;
  title: string;
  body: string;
  deeplink_route: string | null;
  deeplink_params: Record<string, unknown> | null;
  is_read: boolean;
  /** 알림함에 남길지. 푸시만 쏘고 목록엔 안 남기는 종류가 있다(채팅) */
  show_in_center: boolean;
  sent_at: string | null;
  send_status: SendStatus | null;
  /** 실패 사유 — **조용히 실패하는 종류라 이 값이 유일한 단서다** */
  fail_reason: string | null;
  read_at: string | null;
  /** FCM 에 실어 보낸 원본 */
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DbFcmToken {
  id: number;
  user_id: number;
  token: string;
  device_os: DeviceOs;
  /** 마지막 사용 시각 — 죽은 토큰 정리 판단용 */
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * 알림 카테고리 (migration 49 / 52 / 54 / 68).
 *
 * 카테고리를 **코드가 아니라 데이터**로 둔다 — 추가가 DDL 없이 INSERT 한 줄이고,
 * 문구 변경이 앱 배포 없이 반영된다. 어드민 `시스템 > 알림 발송`에서 편집한다.
 */
export interface DbNotificationCategory {
  code: string;
  label: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  /** true 면 사용자가 끌 수 없다 (SYSTEM) */
  is_mandatory: boolean;
  default_enabled: boolean;
  /** SETTINGS = notification_settings / MARKETING_CONSENT = 동의 이력 + 미러 */
  storage: "SETTINGS" | "MARKETING_CONSENT";
  android_channel_id: string | null;
  android_channel_name: string | null;
  android_channel_importance: number;
  ios_interruption_level: string | null;
  /** 모임장에게만 보이는 카테고리인지 (migration 68) */
  requires_host: boolean;
  created_at: string;
  updated_at: string;
}

// ─── 동의 이력 (migration 52 / 55 / 57) ───

/** 광고성 수신 동의 **이력(정본, append-only)**. users.marketing_opt_in 은 미러 */
export interface DbMarketingConsent {
  id: number;
  user_id: number;
  agreed: boolean;
  source:
    | "SIGNUP"
    | "SETTINGS"
    | "ADMIN"
    | "BACKFILL"
    | "RECONFIRM"
    | "UNKNOWN";
  created_at: string;
}

/** 필수 약관 동의 이력(정본, append-only). 개인정보보호법 §22 입증책임 */
export interface DbUserAgreement {
  id: number;
  user_id: number;
  agreement: "AGE_19" | "SERVICE" | "PRIVACY" | "LOCATION";
  agreed: boolean;
  /** 동의 시점의 약관 버전. **버전제 도입 전 데이터는 null** — 소급 추정하지 않는다 */
  version: string | null;
  source: "SIGNUP" | "REVERIFY" | "LEGACY" | "BACKFILL" | "ADMIN" | "UNKNOWN";
  created_at: string;
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
// fn_admin_ban_user='BAN', fn_admin_delete_match='DELETE_MATCH',
// fn_admin_broadcast_notice='BROADCAST_NOTICE',
// fn_update_app_version_policy='UPDATE_APP_VERSION_POLICY',
// fn_set_maintenance='ENABLE_MAINTENANCE'/'DISABLE_MAINTENANCE',
// fn_admin_close_chat_room='CLOSE_CHAT_ROOM').
// 'UNSUSPEND' 와 'UPDATE_NOTIFICATION_CATEGORY' 는 라이브 RPC 가 없어 관리자
// 페이지가 직접 INSERT 하는 값.
// action_type 컬럼은 varchar(100) free text — DB 제약 없음 (UI 힌트용)
export type AuditActionType =
  | "SUSPEND"
  | "BAN"
  | "DELETE_MATCH"
  | "UNSUSPEND"
  | "CLOSE_CHAT_ROOM"
  | "BROADCAST_NOTICE"
  | "UPDATE_NOTIFICATION_CATEGORY"
  | "UPDATE_APP_VERSION_POLICY"
  | "ENABLE_MAINTENANCE"
  | "DISABLE_MAINTENANCE";

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

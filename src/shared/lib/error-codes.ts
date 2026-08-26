/**
 * admin_db_spec.md §7 PostgreSQL 에러 코드 → 한글 메시지
 */

export const PG_ERROR_MESSAGES: Record<string, string> = {
  "42501": "권한이 없습니다 (관리자 인증 필요)",
  P0001: "처리 중 오류가 발생했습니다", // GUEST_NICKNAME_GEN_FAILED (내부)
  P0002: "유저를 찾을 수 없습니다", // USER_NOT_FOUND
  P0003: "영구 차단된 계정입니다", // PERMANENT_BLACKLIST
  P0004: "생년월일 정보가 필요합니다", // BIRTH_YEAR_REQUIRED
  P0005: "만 19세 미만은 가입할 수 없습니다", // AGE_BELOW_MINIMUM
  P0006: "이미 본인인증이 완료된 계정입니다", // IDENTITY_ALREADY_VERIFIED
  P0007: "이미 사용 중인 본인인증 정보입니다", // CI_ALREADY_IN_USE
  P0008: "탈퇴 후 30일 이내에는 재가입할 수 없습니다", // REJOIN_COOLDOWN
  P0010: "이미 호스트로 등록된 계정입니다", // ALREADY_HOST
  P0011: "모임을 찾을 수 없습니다", // MATCH_NOT_FOUND
  P0012: "본인 모임이 아닙니다", // NOT_MATCH_OWNER
  P0013: "이미 종료된 모임입니다", // MATCH_ALREADY_ENDED
  P0014: "이미 시작된 모임입니다", // MATCH_ALREADY_STARTED
  P0015: "진행 중인 모임이 있어 처리할 수 없습니다", // ACTIVE_MATCH_EXISTS
  P0020: "관리자 권한이 없습니다", // NOT_ADMIN
  P0021: "최고 관리자 권한이 필요합니다", // NOT_SUPER_ADMIN
  // 신고/차단 (migration 21) — 관리자 페이지에서 직접 쓰진 않지만 방어
  P0050: "자기 자신은 차단할 수 없습니다", // CANNOT_BLOCK_SELF
  P0051: "차단 대상을 찾을 수 없습니다", // BLOCK_TARGET_NOT_FOUND
  P0052: "신고 사유를 입력해야 합니다", // REPORT_REASON_REQUIRED
  P0053: "본인 모임은 신고할 수 없습니다", // CANNOT_REPORT_OWN_MATCH
  // 앱 버전 정책 (migration 26)
  P0060: "버전은 1.0.5 같은 숫자.숫자.숫자 형식이어야 합니다", // INVALID_VERSION_FORMAT
  P0061: "강제(최소) 버전이 권장 버전보다 높을 수 없습니다", // MIN_VERSION_ABOVE_RECOMMENDED
  P0062: "해당 플랫폼의 버전 정책이 없습니다", // APP_VERSION_POLICY_NOT_FOUND
  // 관리자 조치 공통
  P0040: "사유를 10자 이상 입력해야 합니다", // REASON_REQUIRED
  // 채팅 방 강제 종료 (migration 88)
  P0080: "이 환경에는 채팅 기능이 없습니다", // CHAT_NOT_AVAILABLE
  P0081: "채팅방을 찾을 수 없습니다", // ROOM_NOT_FOUND
  // 서버 점검 모드 (migration 29)
  P0070: "점검 시작/예상 종료 시각을 입력해야 합니다", // MAINTENANCE_TIME_REQUIRED
  P0071: "예상 종료 시각은 시작 시각보다 뒤여야 합니다", // MAINTENANCE_END_BEFORE_START
  P0072: "예상 종료 시각이 이미 지났습니다", // MAINTENANCE_END_IN_PAST
  P0073: "점검 기간은 최대 7일까지 설정할 수 있습니다", // MAINTENANCE_TOO_LONG
};

interface PostgrestErrorLike {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

/** 클라이언트에 안전하게 노출 가능한 메시지 패턴 */
const SAFE_MESSAGE_RE =
  /^[\uAC00-\uD7A3a-zA-Z0-9\s.,!?()가-힣\-_:;'"]{2,200}$/;

export function toUserMessage(error: unknown, fallback = "처리 중 오류가 발생했습니다"): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;

  const e = error as PostgrestErrorLike & Error;
  // 1) 매핑된 PG 에러 코드가 있으면 한글 메시지 반환
  if (e.code && PG_ERROR_MESSAGES[e.code]) {
    return PG_ERROR_MESSAGES[e.code];
  }
  // 2) 직접 throw 한 한글 메시지만 노출 (PG stack trace, SQL 에러 차단)
  if (e.message && SAFE_MESSAGE_RE.test(e.message) && !e.message.includes("SQL") && !e.message.includes("pg_")) {
    return e.message;
  }
  return fallback;
}

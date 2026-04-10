/**
 * admin_db_spec.md §7 PostgreSQL 에러 코드 → 한글 메시지
 */

export const PG_ERROR_MESSAGES: Record<string, string> = {
  "42501": "권한이 없습니다 (관리자 인증 필요)",
  P0001: "만 14세 미만은 사용할 수 없습니다",
  P0002: "영구 차단된 계정입니다",
  P0003: "이미 가입된 본인인증 정보입니다",
  P0004: "30일 이내 재가입은 불가능합니다",
  P0005: "유저 정보를 찾을 수 없습니다",
  P0010: "호스트 등록 자격 미달입니다",
  P0020: "유저를 찾을 수 없습니다",
  P0021: "진행 중인 모임이 있어 처리할 수 없습니다",
  P0030: "모임 상태가 올바르지 않습니다 (마감 불가)",
  P0031: "모임 상태가 올바르지 않습니다 (재모집 불가)",
  P0040: "사유는 10자 이상 입력해야 합니다",
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

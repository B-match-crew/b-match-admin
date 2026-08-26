/**
 * 동의 화면 상수 — `"use server"` 파일에서는 **async 함수만 export** 할 수 있어
 * 상수는 여기로 분리한다 (notices/constants.ts 와 같은 이유).
 */

/** 필수 약관 코드 → 화면 라벨. 앱 IdentityVerificationState 의 4개 항목과 1:1. */
export const AGREEMENT_LABEL: Record<string, string> = {
  AGE_19: "만 19세 이상",
  SERVICE: "서비스 이용약관",
  PRIVACY: "개인정보 처리방침",
  LOCATION: "위치기반 서비스",
};

/** 동의 기록 경로(source) → 화면 라벨. */
export const CONSENT_SOURCE_LABEL: Record<string, string> = {
  SIGNUP: "가입",
  SETTINGS: "설정 변경",
  REVERIFY: "재인증",
  RECONFIRM: "2년 주기 확인",
  BACKFILL: "백필",
  LEGACY: "구버전 앱",
  ADMIN: "관리자",
  UNKNOWN: "미상",
};

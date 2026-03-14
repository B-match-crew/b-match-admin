// 유저 상태
export const USER_STATUS = {
  ACTIVE: "정상",
  SUSPENDED: "정지",
  WITHDRAWN: "탈퇴",
} as const;

// 유저 권한
export const USER_ROLE = {
  REGULAR: "일반",
  HOST: "호스트",
} as const;

// 매칭 모집 상태
export const RECRUITMENT_STATUS = {
  RECRUITING: "모집중",
  CLOSED: "마감",
  COMPLETED: "종료",
  CANCELLED: "취소",
} as const;

// 신고 처리 상태
export const REPORT_STATUS = {
  PENDING: "처리 대기",
  WARNING: "경고",
  SUSPENDED: "정지",
  CLEARED: "무혐의",
} as const;

// 광고 상태
export const AD_STATUS = {
  PENDING: "검수 대기",
  APPROVED: "승인",
  REJECTED: "반려",
  ACTIVE: "노출 중",
  EXPIRED: "종료",
} as const;

// 광고 유형
export const AD_TYPE = {
  BANNER: "배너",
  PIN: "지도핀",
} as const;

// 신청 상태
export const APPLICATION_STATUS = {
  WAITING: "승인 대기",
  PAYMENT_WAITING: "입금 대기",
  PAYMENT_CHECKING: "입금 확인 중",
  CONFIRMED: "참여 확정",
  REJECTED: "신청 거절",
  NO_SHOW: "노쇼",
} as const;

// 실력 등급
export const SKILL_LEVELS = ["S", "A", "B", "C", "D", "초심", "입문"] as const;

// 연령대
export const AGE_GROUPS = ["20대", "30대", "40대", "50대", "60대", "기타"] as const;

// 성별
export const GENDERS = ["남성", "여성"] as const;

// 배티켓 기본 점수
export const BATTIKET_DEFAULT_SCORE = 25.0;

// 페이지네이션
export const DEFAULT_PAGE_SIZE = 20;

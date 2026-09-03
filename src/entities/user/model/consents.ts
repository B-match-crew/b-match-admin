/**
 * 한 사람의 동의 증적 — 개인정보보호법 §22, 정보통신망법 §50⑧.
 *
 * 동의 이력은 append-only 다. 최신 행이 현재 상태이고, 그 앞의 행들이 곧 증적이다.
 * 요약(compliance 화면)과 개인 이력(users 상세 탭)이 같은 모양을 봐야 하므로
 * 두 feature 어느 쪽도 소유하지 않고 entity 로 둔다.
 */

export interface AgreementRecord {
  id: number;
  agreement: string;
  agreed: boolean;
  version: string | null;
  source: string;
  createdAt: string;
}

export interface MarketingRecord {
  id: number;
  agreed: boolean;
  source: string;
  createdAt: string;
}

export interface UserConsents {
  agreements: AgreementRecord[];
  marketing: MarketingRecord[];
  /** users.marketing_opt_in — 정본(marketing 최신 행)과 대조용 */
  mirrorOptIn: boolean;
}

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

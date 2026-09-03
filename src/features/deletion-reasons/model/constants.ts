/**
 * 탈퇴 사유 화면 상수 — `"use server"` 파일에서는 async 함수만 export 할 수
 * 있어 상수는 여기로 분리한다 (compliance/constants.ts 와 같은 이유).
 */

/**
 * 사유 코드 → 화면 라벨. 앱 `AccountDeleteReason` 열거형과 1:1.
 *
 * 🔴 서버는 코드를 검증하지 않는다 — 앱이 정본이다. 앱이 새 코드를 추가하고
 *    여기에 없으면 코드 문자열이 그대로 보인다(깨지지는 않는다).
 */
export const DELETION_REASON_LABEL: Record<string, string> = {
  LOW_USAGE: "사용 빈도가 낮아서",
  HARD_TO_FIND: "원하는 모임을 찾기 어려워서",
  INCONVENIENT: "서비스 이용이 불편해서",
  OTHER_SERVICE: "다른 서비스를 이용 중이라서",
};

/**
 * 앱 1.1.1 이하가 남긴 행. 그 버전은 사유를 코드가 아니라 **한글 문구를 ' / '
 * 로 이어 붙인 문자열 하나**로 보냈다(app migration 99 하위호환). 코드가
 * 없으므로 집계에서 이 이름으로 묶이고, 내용은 상세 목록의 자유입력에 있다.
 */
export const LEGACY_REASON_CODE = "(구버전)";

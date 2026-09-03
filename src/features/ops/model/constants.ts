/**
 * 운영 상태 화면 상수 — `"use server"` 파일에서는 **async 함수만 export** 할 수
 * 있어 상수는 여기로 분리한다 (notices/constants.ts 와 같은 이유).
 */

/**
 * 분석 집계(app migration 38)가 **이름 문자열로** 찾는 이벤트들.
 *
 * 38 의 SQL 안에 그대로 박혀 있는 값이라, 앱이 이름을 바꾸면 에러 없이 해당
 * 퍼널 단계가 0 이 된다. 목록에 있어야 할 이름이 수집 목록에서 사라졌는지
 * 화면에서 대조하기 위해 여기 둔다 — 두 곳에 적히는 값이므로, 38 을 고칠 때
 * 이 배열도 함께 고쳐야 한다.
 */
export const TRACKED_EVENTS = [
  "match_list_view",
  "match_detail_view",
  "contact_host",
  "login_gate_shown",
  "signup_complete",
] as const;

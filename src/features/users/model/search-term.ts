/**
 * 유저 검색어를 어떤 컬럼으로 찾을지 정한다 — 순수 함수라 테스트로 고정한다.
 *
 * 🔴 전화번호는 **숫자만** 저장된다(verify-portone 이 `replace(/[^0-9]/g, "")`).
 *    예전 분류는 숫자만 있는 검색어를 전부 `users.id` 로 보내고, 하이픈이 섞인
 *    검색어는 하이픈째 `phone_number` 와 비교해 **전화번호로는 아무도 못 찾았다.**
 *
 * 규칙
 *  - UUID → `auth_user_id`
 *  - 숫자·하이픈·공백·`+` 로만 된 검색어 → 숫자만 남긴다
 *    · 0 으로 시작하거나 9자리 이상 → 전화번호 부분 일치
 *    · 그 밖의 짧은 숫자 → users.id 일치 **또는** 전화번호 부분 일치
 *  - 그 밖 → 실명·닉네임 부분 일치
 */
export type UserSearchTerm =
  | { kind: "none" }
  | { kind: "authUserId"; value: string }
  | { kind: "phone"; digits: string }
  | { kind: "idOrPhone"; id: number; digits: string }
  | { kind: "text"; value: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHONE_LIKE_RE = /^[0-9\-\s+]+$/;

export function classifyUserSearchTerm(raw: string | undefined): UserSearchTerm {
  const term = raw?.trim() ?? "";
  if (term.length === 0) return { kind: "none" };
  if (UUID_RE.test(term)) return { kind: "authUserId", value: term };
  if (PHONE_LIKE_RE.test(term)) {
    const digits = term.replace(/[^0-9]/g, "");
    if (digits.length === 0) return { kind: "text", value: term };
    if (digits.startsWith("0") || digits.length >= 9) {
      return { kind: "phone", digits };
    }
    return { kind: "idOrPhone", id: Number(digits), digits };
  }
  return { kind: "text", value: term };
}

/**
 * PostgREST `or=(…)` 안에 넣을 값을 따옴표로 감싼다.
 *
 * 검색어를 그대로 붙이면 `,` 나 `)` 가 필터 구문으로 읽혀 조건이 깨지거나 모양이
 * 바뀐다(예: `a,name.eq.x`). 큰따옴표로 감싸고 안의 `\` 와 `"` 를 이스케이프한다.
 */
export function quoteOrValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

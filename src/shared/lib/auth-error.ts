/**
 * 인가 실패 — 서버가 던지고, 클라이언트가 코드로 갈라 처리한다.
 *
 * 서버 전용(`server-only`)인 role-guard 와 분리해 둔 이유: 코드 목록을
 * 클라이언트(재시도 정책 · 에러 화면)도 봐야 하기 때문이다. 문자열을 양쪽에
 * 따로 적으면 한쪽만 바뀌는 날이 온다.
 */
export const AUTH_ERROR_CODES = [
  "AUTH_REQUIRED",
  "NOT_ADMIN",
  "NOT_SUPER_ADMIN",
] as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

/**
 * `code` 를 실어 던진다.
 *
 * 문자열 Error 로 던지면 runAction 이 code 없이 메시지만 실어 보내고, 화면은
 * "로그인 필요" 와 "권한 없음" 을 구분하지 못한다. 전자는 로그인으로 보내야
 * 하고 후자는 보내봐야 같은 화면으로 되돌아온다.
 *
 * 코드값은 DB 쪽 P0020/P0021(error-codes.ts)과 같은 이름을 쓴다 — 같은 사실을
 * 두 이름으로 부르지 않기 위해서다.
 */
export class AuthError extends Error {
  constructor(
    readonly code: AuthErrorCode,
    message: string
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/** 재시도해도 결과가 바뀌지 않는 실패인가 — 인가는 다시 물어도 같은 답이다. */
export function isTerminalAuthCode(code: string | undefined): boolean {
  return !!code && (AUTH_ERROR_CODES as readonly string[]).includes(code);
}

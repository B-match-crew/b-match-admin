import { toUserMessage } from "./error-codes";

/**
 * 서버 액션의 에러를 "던지지 않고 값으로" 실어 나르기 위한 타입과 래퍼.
 *
 * ⚠️ 이 파일에 "use server" 를 붙이지 말 것 — 그러면 async 함수만 export 할 수
 *    있어서 타입 export 가 막힌다. (src/features/notices/constants.ts 참고)
 */

export interface ActionError {
  /** PG/PostgREST 에러 코드 (예: "PGRST202", "42501"). 없을 수 있다. */
  code?: string;
  /** 사용자에게 보여줄 한글 메시지 */
  message: string;
}

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };

/**
 * 서버 액션 본문을 감싼다. throw 대신 값으로 에러를 반환한다.
 *
 * Next.js 는 서버 액션에서 throw 된 에러를 프로덕션에서 마스킹하므로
 * (클라이언트엔 generic 메시지 + digest 만 도착) 원인을 화면에 띄우려면
 * 반환하는 수밖에 없다. 2026-08-13 통계 3개 섹션 장애 때 브라우저에는
 * `POST /stats 500` 만 찍히고 실제 원인(PGRST202)은 Vercel 로그에만 있었다.
 */
export async function runAction<T>(
  fn: () => Promise<T>
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    // 전체 원문은 런타임 로그에 남긴다 (지금까지 유일한 진단 경로였다)
    console.error("[action]", e);
    const code = (e as { code?: string })?.code;
    return { ok: false, error: { code, message: toUserMessage(e) } };
  }
}

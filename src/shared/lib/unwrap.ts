import type { ActionError, ActionResult } from "./action-result";

/**
 * ActionResult 의 실패를 Error 로 되살린 것. react-query 의 `error` 로 흐른다.
 * 서버가 실어 보낸 PG 에러 코드를 그대로 들고 있어서 화면에 띄울 수 있다.
 */
export class ActionFailure extends Error {
  readonly code?: string;

  constructor(error: ActionError) {
    super(error.message);
    this.name = "ActionFailure";
    this.code = error.code;
  }
}

/** ActionResult 를 풀어 react-query 의 error 로 흘려보낸다. */
export async function unwrap<T>(p: Promise<ActionResult<T>>): Promise<T> {
  const r = await p;
  if (r.ok) return r.data;
  throw new ActionFailure(r.error);
}

/**
 * 긴급공지 상수 — `"use server"` 파일에서는 **async 함수만 export** 할 수 있어
 * 상수/타입은 여기로 분리한다. (actions.ts 에 두면 모듈 전체가 export 없음으로
 * 처리돼 클라이언트 import 가 통째로 깨진다)
 */

export type BroadcastTarget = "ALL" | "HOST";

/** 제목/본문 상한 — `notifications.title/body` 컬럼 길이와 같다. */
export const NOTICE_TITLE_MAX = 100;
export const NOTICE_BODY_MAX = 500;

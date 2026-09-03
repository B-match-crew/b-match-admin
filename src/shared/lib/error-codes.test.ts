import { describe, expect, it } from "vitest";
import { PG_ERROR_MESSAGES, toUserMessage } from "./error-codes";
import { AuthError } from "./auth-error";

/**
 * 이 매핑이 조용히 비면 화면에는 "처리 중 오류가 발생했습니다" 만 남는다.
 * 2026-08-13 통계 장애 때 브라우저에 `POST /stats 500` 만 찍히고 원인
 * (PGRST202)이 Vercel 로그에만 있던 것이 이 경로의 문제였다.
 */
describe("toUserMessage", () => {
  it("매핑된 PG 코드는 한글 메시지로 바뀐다", () => {
    expect(toUserMessage({ code: "P0002", message: "whatever" })).toBe(
      PG_ERROR_MESSAGES.P0002
    );
  });

  it("SQL·내부 식별자 표식이 있는 메시지는 막는다", () => {
    expect(toUserMessage(new Error("SQL error at pg_catalog"))).toBe(
      "처리 중 오류가 발생했습니다"
    );
  });

  /**
   * 표식이 없는 Postgres 영문 메시지는 **일부러** 그대로 보인다.
   *
   * 어드민은 로그인 뒤에만 열리는 내부 도구라 원인을 감출 이유가 없다 —
   * query-error 가 PG 코드를 뱃지로 병기하는 것도 같은 판단이다. 2026-08-13
   * 통계 장애 때 브라우저에 `POST /stats 500` 만 찍히고 원인이 Vercel 로그에만
   * 있어 진단이 늦었다.
   *
   * 이 화면이 로그인 밖으로 나가는 날이 오면 이 테스트가 먼저 바뀌어야 한다.
   */
  it("표식 없는 영문 원문은 진단을 위해 그대로 노출한다", () => {
    expect(toUserMessage(new Error('relation "users" does not exist'))).toBe(
      'relation "users" does not exist'
    );
  });

  it("길이 상한(200자)을 넘는 원문은 기본 문구로 잘라낸다", () => {
    expect(toUserMessage(new Error("a".repeat(300)))).toBe(
      "처리 중 오류가 발생했습니다"
    );
  });

  it("직접 던진 한글 메시지는 그대로 보인다", () => {
    expect(toUserMessage(new Error("관리자 권한이 없습니다"))).toBe(
      "관리자 권한이 없습니다"
    );
  });

  it("빈 입력은 기본 문구", () => {
    expect(toUserMessage(null)).toBe("처리 중 오류가 발생했습니다");
    expect(toUserMessage(undefined)).toBe("처리 중 오류가 발생했습니다");
  });
});

describe("AuthError", () => {
  /**
   * 코드가 실려야 화면이 "로그인 필요"(로그인으로 보낸다)와 "권한 없음"
   * (보내봐야 되돌아온다)을 구분한다.
   */
  it("코드를 싣고, 메시지는 사용자에게 보여도 되는 형태다", () => {
    const e = new AuthError("AUTH_REQUIRED", "로그인이 필요합니다");
    expect(e.code).toBe("AUTH_REQUIRED");
    expect(toUserMessage(e)).toBe("로그인이 필요합니다");
  });
});

import { describe, expect, it } from "vitest";
import { classifyUserSearchTerm, quoteOrValue } from "./search-term";

describe("classifyUserSearchTerm", () => {
  it("빈 검색어는 조건 없음", () => {
    expect(classifyUserSearchTerm("  ")).toEqual({ kind: "none" });
    expect(classifyUserSearchTerm(undefined)).toEqual({ kind: "none" });
  });

  it("UUID 는 auth_user_id", () => {
    const id = "0f8fad5b-d9cb-469f-a165-70867728950e";
    expect(classifyUserSearchTerm(id)).toEqual({ kind: "authUserId", value: id });
  });

  it("⭐ 하이픈 섞인 전화번호는 숫자만 남겨 전화번호로 찾는다", () => {
    expect(classifyUserSearchTerm("010-1234-5678")).toEqual({
      kind: "phone",
      digits: "01012345678",
    });
  });

  it("⭐ 0 으로 시작하는 숫자는 전화번호 — 예전엔 users.id 로 보내 아무도 못 찾았다", () => {
    expect(classifyUserSearchTerm("01012345678")).toEqual({
      kind: "phone",
      digits: "01012345678",
    });
    expect(classifyUserSearchTerm("0101234")).toEqual({
      kind: "phone",
      digits: "0101234",
    });
  });

  it("9자리 이상 숫자는 전화번호", () => {
    expect(classifyUserSearchTerm("123456789")).toEqual({
      kind: "phone",
      digits: "123456789",
    });
  });

  it("짧은 숫자는 users.id 이거나 전화번호 일부", () => {
    expect(classifyUserSearchTerm("5678")).toEqual({
      kind: "idOrPhone",
      id: 5678,
      digits: "5678",
    });
  });

  it("글자가 섞이면 실명·닉네임", () => {
    expect(classifyUserSearchTerm("홍길동")).toEqual({ kind: "text", value: "홍길동" });
    expect(classifyUserSearchTerm("abc123")).toEqual({ kind: "text", value: "abc123" });
  });
});

describe("quoteOrValue", () => {
  it("⭐ 쉼표·괄호가 필터 구문으로 읽히지 않게 따옴표로 감싼다", () => {
    expect(quoteOrValue("%a,name.eq.x%")).toBe('"%a,name.eq.x%"');
    expect(quoteOrValue("%a)%")).toBe('"%a)%"');
  });

  it("따옴표와 역슬래시는 이스케이프한다", () => {
    expect(quoteOrValue('a"b\\c')).toBe('"a\\"b\\\\c"');
  });
});

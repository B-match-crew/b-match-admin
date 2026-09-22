import { describe, expect, it } from "vitest";
import { csvCell } from "./csv-export";

describe("csvCell", () => {
  it("따옴표를 두 번 써서 감싼다", () => {
    expect(csvCell('a"b')).toBe('"a""b"');
    expect(csvCell(null)).toBe('""');
  });

  it("⭐ 수식으로 시작하는 칸은 ' 를 붙여 글자로 둔다 (닉네임 주입 방지)", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell("+1+1")).toBe("\"'+1+1\"");
    expect(csvCell("@SUM(A1)")).toBe("\"'@SUM(A1)\"");
    expect(csvCell("-cmd")).toBe("\"'-cmd\"");
    expect(csvCell("\tx")).toBe("\"'\tx\"");
  });

  it("음수·소수 같은 순수 숫자는 그대로 둔다 — 리포트 숫자가 글자가 되면 안 된다", () => {
    expect(csvCell("-5")).toBe('"-5"');
    expect(csvCell(-1.5)).toBe('"-1.5"');
    expect(csvCell(12)).toBe('"12"');
  });
});

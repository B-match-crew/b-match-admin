import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 서버 프리페치와 화면의 queryKey 가 어긋나면 **조용히 비용이 늘어난다.**
 * 하이드레이션이 안 붙어 같은 조회가 클라이언트에서 한 번 더 나가는데,
 * 화면은 멀쩡히 그려지므로 아무도 눈치채지 못한다.
 *
 * 실제로 한 번 어긋났다 — 섹션은 days 를 number 로 키에 넣는데 프리페치는
 * 문자열 "30" 을 넣었다.
 */
const KEY_RE = /queryKey: (\[[^\]]*\])/g;

function keysIn(path: string): Set<string> {
  const out = new Set<string>();
  for (const m of readFileSync(path, "utf8").matchAll(KEY_RE)) {
    out.add(m[1].replace(/\s+/g, ""));
  }
  return out;
}

describe("통계 프리페치", () => {
  const sectionsDir = join(process.cwd(), "src/features/stats/ui/sections");
  const sectionKeys = new Set<string>();
  for (const f of readdirSync(sectionsDir)) {
    for (const k of keysIn(join(sectionsDir, f))) sectionKeys.add(k);
  }
  const prefetchKeys = keysIn(
    join(process.cwd(), "src/features/stats/api/prefetch.ts")
  );

  it("화면이 쓰는 모든 조회를 서버가 미리 채운다", () => {
    expect([...sectionKeys].filter((k) => !prefetchKeys.has(k))).toEqual([]);
  });

  it("화면이 쓰지 않는 조회를 서버가 채우지 않는다", () => {
    expect([...prefetchKeys].filter((k) => !sectionKeys.has(k))).toEqual([]);
  });

  it("섹션이 10개 있다 — 프리페치 목록이 조용히 비지 않았는가", () => {
    expect(sectionKeys.size).toBe(10);
  });
});

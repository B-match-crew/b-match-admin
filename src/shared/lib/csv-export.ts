/**
 * 클라이언트 사이드 CSV 다운로드 유틸.
 * Server Action 결과를 받아서 브라우저에서 CSV 파일로 저장.
 */

/**
 * CSV 한 칸 — 따옴표 이스케이프 + **수식 주입 방지**.
 *
 * `=`·`+`·`-`·`@`·탭·CR 로 시작하는 칸은 Excel·시트가 수식으로 실행한다. 닉네임처럼
 * 사용자가 정한 값이 CSV 로 나가므로(유저 목록), 앞에 `'` 를 붙여 글자로 둔다.
 * 음수 같은 순수 숫자는 건드리지 않는다 — 리포트 숫자가 글자로 바뀌면 안 된다.
 */
export function csvCell(cell: unknown): string {
  let s = String(cell ?? "");
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) {
    s = `'${s}`;
  }
  return `"${s.replace(/"/g, '""')}"`;
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: string[][]
) {
  const bom = "\uFEFF"; // Excel에서 한글 깨짐 방지
  const csv =
    bom +
    [headers, ...rows]
      .map((row) =>
        row.map(csvCell).join(",")
      )
      .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 클라이언트 사이드 CSV 다운로드 유틸.
 * Server Action 결과를 받아서 브라우저에서 CSV 파일로 저장.
 */

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
        row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
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

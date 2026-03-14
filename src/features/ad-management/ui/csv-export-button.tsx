"use client";

import { useAdStore } from "../model/ad-store";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import toast from "react-hot-toast";

export function CsvExportButton() {
  const { performance } = useAdStore();

  function handleExport() {
    if (performance.length === 0) {
      toast.error("내보낼 데이터가 없습니다");
      return;
    }

    const headers = ["광고 ID", "광고주", "유형", "클릭수", "노출수", "CTR(%)"];
    const rows = performance.map((item) => [
      item.id,
      item.advertiserName,
      item.type,
      String(item.clickCount),
      String(item.impressionCount),
      item.ctr.toFixed(2),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `ad-performance-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
    toast.success("CSV 파일이 다운로드되었습니다");
  }

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      CSV 내보내기
    </Button>
  );
}

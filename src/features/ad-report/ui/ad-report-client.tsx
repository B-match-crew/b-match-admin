"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Button } from "@/src/shared/ui/kit/button";
import { QueryError } from "@/src/shared/ui/query-error";
import { downloadCsv } from "@/src/shared/lib/csv-export";
import { kstToday } from "@/src/shared/lib/kst-range";
import { unwrap } from "@/src/shared/lib/unwrap";
import { fetchHomeImpressionReport } from "../api/actions";
import {
  presetRange,
  validateRange,
  type DateRangeKst,
  type PeriodPreset,
} from "../model/period";
import { reportCsv } from "../model/report";
import { PeriodPicker } from "./period-picker";
import {
  CollectionNotice,
  DailyChart,
  DailyTable,
  ImpressionDefinition,
  SummaryTiles,
} from "./report-sections";

export function AdReportClient() {
  const [preset, setPreset] = useState<PeriodPreset>("last30");
  const [custom, setCustom] = useState<DateRangeKst | null>(null);

  const range =
    preset === "custom" && custom
      ? custom
      : presetRange(preset === "custom" ? "last30" : preset, kstToday());
  const invalid = validateRange(range);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["ad-report-home", range.from, range.to],
    queryFn: () => unwrap(fetchHomeImpressionReport(range)),
    enabled: invalid == null,
  });

  // CSV 는 화면의 현재 선택이 아니라 **받아 온 리포트의 기간**으로 만든다.
  const download = () => {
    if (!data) return;
    const csv = reportCsv(data);
    downloadCsv(csv.filename, csv.headers, csv.rows);
  };

  return (
    <div className="space-y-6">
      <ImpressionDefinition />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <PeriodPicker
          preset={preset}
          range={range}
          error={invalid}
          onPresetChange={setPreset}
          onCustomApply={(r) => {
            setCustom(r);
            setPreset("custom");
          }}
        />
        <Button variant="outline" size="sm" disabled={!data} onClick={download}>
          <Download />
          CSV 다운로드
        </Button>
      </div>

      {isError ? (
        <QueryError
          section="광고 리포트"
          error={error}
          onRetry={() => void refetch()}
        />
      ) : (
        <>
          <CollectionNotice report={data} />
          <SummaryTiles summary={data?.summary} loading={isLoading} />
          <DailyChart report={data} loading={isLoading} />
          <DailyTable report={data} loading={isLoading} />
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useCallback } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { useFinanceStore } from "@/src/features/finance/model/finance-store";
import {
  fetchFinanceSummary,
  fetchDailyTransactions,
  generateFinanceTsv,
} from "@/src/features/finance/api/finance-api";
import { FinanceSummaryCards } from "@/src/features/finance/ui/finance-summary-cards";
import { FinanceChart } from "@/src/features/finance/ui/finance-chart";
import { PageHeader } from "@/src/shared/ui/page-header";
import { LoadingSpinner } from "@/src/shared/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

export default function FinancePage() {
  const supabase = useSupabase();
  const {
    summary,
    dailyTransactions,
    isLoading,
    period,
    setSummary,
    setDailyTransactions,
    setLoading,
    setPeriod,
  } = useFinanceStore();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, dailyData] = await Promise.all([
        fetchFinanceSummary(supabase),
        fetchDailyTransactions(supabase, period),
      ]);
      setSummary(summaryData);
      setDailyTransactions(dailyData);
    } catch (error) {
      console.error("재무 데이터 로딩 실패:", error);
      toast.error("재무 데이터를 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  }, [supabase, period, setSummary, setDailyTransactions, setLoading]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExportTsv = () => {
    if (!summary) return;

    const tsv = generateFinanceTsv(summary, dailyTransactions);
    const blob = new Blob([tsv], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance_${new Date().toISOString().split("T")[0]}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("TSV 파일이 다운로드되었습니다");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="재무 대시보드"
        description="거래액, 환불액, 미정산액 등 재무 지표를 확인합니다"
        actions={
          <div className="flex items-center gap-2">
            <Select
              value={String(period)}
              onValueChange={(v) => setPeriod(Number(v))}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">최근 7일</SelectItem>
                <SelectItem value="14">최근 14일</SelectItem>
                <SelectItem value="30">최근 30일</SelectItem>
                <SelectItem value="90">최근 90일</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="mr-1 h-4 w-4" />
              새로고침
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportTsv}
              disabled={!summary}
            >
              <Download className="mr-1 h-4 w-4" />
              TSV 내보내기
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : summary ? (
        <>
          <FinanceSummaryCards summary={summary} />
          <FinanceChart data={dailyTransactions} />
        </>
      ) : (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          재무 데이터를 불러올 수 없습니다
        </div>
      )}
    </div>
  );
}

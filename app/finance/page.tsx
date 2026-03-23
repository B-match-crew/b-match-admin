"use client";

import { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { useAuth } from "@/src/app/providers/auth-provider";
import { PageHeader } from "@/src/shared/ui/page-header";
import { LoadingSpinner } from "@/src/shared/ui/loading-spinner";
import { FinanceSummaryCards } from "@/src/features/finance-dashboard/ui/finance-summary-cards";
import { RecentTransactions } from "@/src/features/finance-dashboard/ui/recent-transactions";
import {
  fetchFinanceSummary,
  fetchRecentTransactions,
  type FinanceSummary,
  type RecentTransaction,
} from "@/src/features/finance-dashboard/api/finance-api";
import { canWriteFinance } from "@/src/shared/lib/role-guard";
import { Badge } from "@/components/ui/badge";

export default function FinancePage() {
  const supabase = useSupabase();
  const { role } = useAuth();
  const canWrite = canWriteFinance(role);

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [summaryData, txData] = await Promise.all([
        fetchFinanceSummary(supabase),
        fetchRecentTransactions(supabase, 15),
      ]);
      setSummary(summaryData);
      setTransactions(txData);
    } catch (error) {
      console.error("재무 데이터 로딩 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="재무 대시보드"
          description="거래액, 환불액, 미정산액 등 재무 지표를 확인합니다"
        />
        {!canWrite && (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            읽기 전용
          </Badge>
        )}
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : summary ? (
        <div className="space-y-6">
          <FinanceSummaryCards summary={summary} />
          <RecentTransactions transactions={transactions} />
        </div>
      ) : (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          재무 데이터를 불러올 수 없습니다
        </div>
      )}
    </div>
  );
}

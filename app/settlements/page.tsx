"use client";

import { useCallback } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { useSettlementStore } from "@/src/features/settlement/model/settlement-store";
import { fetchSettlements, fetchRefunds } from "@/src/features/settlement/api/settlement-api";
import { SettlementTable } from "@/src/features/settlement/ui/settlement-table";
import { RefundTable } from "@/src/features/settlement/ui/refund-table";
import { SettlementActionBar } from "@/src/features/settlement/ui/settlement-action-bar";
import { PageHeader } from "@/src/shared/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HandCoins, RotateCcw } from "lucide-react";

export default function SettlementsPage() {
  const supabase = useSupabase();
  const {
    activeTab,
    statusFilter,
    page,
    selectedIds,
    setActiveTab,
    setSettlements,
    setRefunds,
    setLoading,
  } = useSettlementStore();

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "withdrawal") {
        const result = await fetchSettlements(supabase, {
          status: statusFilter,
          page,
        });
        setSettlements(result.settlements, result.totalCount);
      } else {
        const result = await fetchRefunds(supabase, {
          status: statusFilter,
          page,
        });
        setRefunds(result.refunds, result.totalCount);
      }
    } catch (error) {
      console.error("데이터 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, activeTab, statusFilter, page, setSettlements, setRefunds, setLoading]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="정산 관리"
        description="호스트 출금 요청과 게스트 환불 내역을 관리합니다"
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "withdrawal" | "refund")}
      >
        <TabsList>
          <TabsTrigger value="withdrawal">
            <HandCoins className="mr-1 h-4 w-4" />
            호스트 출금 요청
          </TabsTrigger>
          <TabsTrigger value="refund">
            <RotateCcw className="mr-1 h-4 w-4" />
            게스트 환불 내역
          </TabsTrigger>
        </TabsList>

        <TabsContent value="withdrawal" className="space-y-4">
          {selectedIds.length > 0 && (
            <SettlementActionBar onRefresh={refreshData} />
          )}
          <SettlementTable />
        </TabsContent>

        <TabsContent value="refund">
          <RefundTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}

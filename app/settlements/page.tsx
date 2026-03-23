"use client";

import { PageHeader } from "@/src/shared/ui/page-header";
import { SettlementTable } from "@/src/features/settlement-management/ui/settlement-table";
import { RefundTable } from "@/src/features/settlement-management/ui/refund-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/src/app/providers/auth-provider";
import { canWriteFinance } from "@/src/shared/lib/role-guard";
import { Badge } from "@/components/ui/badge";

export default function SettlementsPage() {
  const { role } = useAuth();
  const canWrite = canWriteFinance(role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="정산 관리"
          description="호스트 정산 및 게스트 환불 요청을 관리합니다"
        />
        {!canWrite && (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            읽기 전용
          </Badge>
        )}
      </div>

      <Tabs defaultValue="settlements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settlements">호스트 출금</TabsTrigger>
          <TabsTrigger value="refunds">게스트 환불</TabsTrigger>
        </TabsList>

        <TabsContent value="settlements">
          <SettlementTable />
        </TabsContent>

        <TabsContent value="refunds">
          <RefundTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}

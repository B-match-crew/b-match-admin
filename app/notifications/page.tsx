"use client";

import { PageHeader } from "@/src/shared/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PushComposeForm } from "@/src/features/push-notification/ui/push-compose-form";
import { PushHistoryTable } from "@/src/features/push-notification/ui/push-history-table";
import { usePushStore } from "@/src/features/push-notification/model/push-store";

export default function NotificationsPage() {
  const { activeTab, setActiveTab } = usePushStore();

  return (
    <div className="space-y-6">
      <PageHeader
        title="알림 발송"
        description="푸시 알림을 작성하고 발송 이력을 확인하세요"
      />
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="compose">알림 작성</TabsTrigger>
          <TabsTrigger value="history">발송 이력</TabsTrigger>
        </TabsList>
        <TabsContent value="compose">
          <PushComposeForm />
        </TabsContent>
        <TabsContent value="history">
          <PushHistoryTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}

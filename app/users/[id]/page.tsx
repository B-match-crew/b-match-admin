"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { PageHeader } from "@/src/shared/ui/page-header";
import { UserDetailPanel } from "@/src/features/user-management/ui/user-detail-panel";
import { UserHistoryTabs } from "@/src/features/user-management/ui/user-history-tabs";
import { ScoreAdjustmentDialog } from "@/src/features/user-management/ui/score-adjustment-dialog";
import { SuspensionDialog } from "@/src/features/user-management/ui/suspension-dialog";
import { adminUpdateUserStatus, adminAdjustBatticket } from "@/src/app/actions/admin-actions";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { User } from "@/src/entities/user/types";
import toast from "react-hot-toast";

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = useSupabase();
  const userId = params.id as string;

  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
  const [suspensionDialogOpen, setSuspensionDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleScoreAdjust = (user: User) => {
    setSelectedUser(user);
    setScoreDialogOpen(true);
  };

  const handleSuspend = (user: User) => {
    setSelectedUser(user);
    setSuspensionDialogOpen(true);
  };

  const handleUnsuspend = async () => {
    try {
      await adminUpdateUserStatus(userId, "ACTIVE");
      toast.success("유저 정지가 해제되었습니다");
      setRefreshKey((prev) => prev + 1);
    } catch {
      toast.error("정지 해제에 실패했습니다");
    }
  };

  const handleScoreConfirm = async (scoreChange: number, reason: string) => {
    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (!adminUser) {
        toast.error("관리자 인증 정보를 확인할 수 없습니다");
        return;
      }

      await adminAdjustBatticket(userId, scoreChange, reason, adminUser.id);
      toast.success("배티켓 점수가 조정되었습니다");
      setRefreshKey((prev) => prev + 1);
    } catch {
      toast.error("점수 조정에 실패했습니다");
    }
  };

  const handleSuspendConfirm = async (_reason: string) => {
    try {
      await adminUpdateUserStatus(userId, "SUSPENDED");
      toast.success("유저가 정지 처리되었습니다");
      setRefreshKey((prev) => prev + 1);
    } catch {
      toast.error("유저 정지에 실패했습니다");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="유저 상세"
        description="유저의 상세 정보를 확인하고 관리할 수 있습니다"
        actions={
          <Button variant="outline" onClick={() => router.push("/users")}>
            <ArrowLeft className="h-4 w-4" />
            목록으로
          </Button>
        }
      />

      <div className="max-w-2xl">
        <UserDetailPanel
          key={refreshKey}
          userId={userId}
          onScoreAdjust={handleScoreAdjust}
          onSuspend={handleSuspend}
          onUnsuspend={handleUnsuspend}
        />
      </div>

      <div className="max-w-4xl">
        <UserHistoryTabs key={`tabs-${refreshKey}`} userId={userId} />
      </div>

      <ScoreAdjustmentDialog
        open={scoreDialogOpen}
        onOpenChange={setScoreDialogOpen}
        user={selectedUser}
        onConfirm={handleScoreConfirm}
      />

      <SuspensionDialog
        open={suspensionDialogOpen}
        onOpenChange={setSuspensionDialogOpen}
        user={selectedUser}
        onConfirm={handleSuspendConfirm}
      />
    </div>
  );
}

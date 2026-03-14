"use client";

import { useState } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { PageHeader } from "@/src/shared/ui/page-header";
import { MatchingTable } from "@/src/features/matching-monitor/ui/matching-table";
import { MatchingDetailDialog } from "@/src/features/matching-monitor/ui/matching-detail-dialog";
import { DeleteMatchingDialog } from "@/src/features/matching-monitor/ui/delete-matching-dialog";
import { deleteMatching } from "@/src/features/matching-monitor/api/matching-api";
import { useMatchingStore } from "@/src/features/matching-monitor/model/matching-store";
import type { Matching } from "@/src/entities/matching/types";
import toast from "react-hot-toast";

export default function MatchingsPage() {
  const supabase = useSupabase();
  const { setPage, page } = useMatchingStore();

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMatching, setSelectedMatching] = useState<Matching | null>(
    null
  );

  const handleViewDetail = (matching: Matching) => {
    setSelectedMatching(matching);
    setDetailDialogOpen(true);
  };

  const handleDeleteRequest = (matching: Matching) => {
    setSelectedMatching(matching);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (
    _reason: string,
    _notifyHost: boolean
  ) => {
    if (!selectedMatching) return;

    try {
      await deleteMatching(supabase, selectedMatching.id);
      toast.success("매칭이 삭제(취소)되었습니다");
      // 목록 새로고침을 위해 page를 다시 설정
      setPage(page);
    } catch (error) {
      toast.error("매칭 삭제에 실패했습니다");
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="매칭 모니터링"
        description="등록된 매칭을 조회하고 관리할 수 있습니다"
      />

      <MatchingTable
        onViewDetail={handleViewDetail}
        onDelete={handleDeleteRequest}
      />

      <MatchingDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        matching={selectedMatching}
      />

      <DeleteMatchingDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        matching={selectedMatching}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

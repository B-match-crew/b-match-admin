"use client";

import { useState } from "react";
import { PageHeader } from "@/src/shared/ui/page-header";
import { MatchingTable } from "@/src/features/matching-monitor/ui/matching-table";
import { MatchingDetailDialog } from "@/src/features/matching-monitor/ui/matching-detail-dialog";
import { DeleteMatchingDialog } from "@/src/features/matching-monitor/ui/delete-matching-dialog";
import { adminDeleteMatching } from "@/src/app/actions/admin-actions";
import { useMatchingStore } from "@/src/features/matching-monitor/model/matching-store";
import type { Match } from "@/src/entities/matching/types";
import toast from "react-hot-toast";

export default function MatchesPage() {
  const { setPage, page } = useMatchingStore();

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const handleViewDetail = (match: Match) => {
    setSelectedMatch(match);
    setDetailDialogOpen(true);
  };

  const handleDeleteRequest = (match: Match) => {
    setSelectedMatch(match);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (
    _reason: string,
    _notifyHost: boolean
  ) => {
    if (!selectedMatch) return;

    try {
      await adminDeleteMatching(selectedMatch.id);
      toast.success("매칭이 취소되었습니다");
      setPage(page);
    } catch {
      toast.error("매칭 취소에 실패했습니다");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="매칭 관리"
        description="등록된 매칭을 조회하고 관리할 수 있습니다"
      />

      <MatchingTable
        onViewDetail={handleViewDetail}
        onDelete={handleDeleteRequest}
      />

      <MatchingDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        matching={selectedMatch}
      />

      <DeleteMatchingDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        matching={selectedMatch}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

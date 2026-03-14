"use client";

import { useState, useCallback } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { PageHeader } from "@/src/shared/ui/page-header";
import { ReportTable } from "@/src/features/report-management/ui/report-table";
import { ReportDetailPanel } from "@/src/features/report-management/ui/report-detail-panel";
import { ReportActionDialog } from "@/src/features/report-management/ui/report-action-dialog";
import { processReport } from "@/src/features/report-management/api/report-api";
import { useReportStore } from "@/src/features/report-management/model/report-store";
import type { Report } from "@/src/entities/report/types";
import toast from "react-hot-toast";

export default function ReportsPage() {
  const supabase = useSupabase();
  const { setPage, page } = useReportStore();

  const [detailOpen, setDetailOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [actionReport, setActionReport] = useState<Report | null>(null);

  const handleSelectReport = useCallback((report: Report) => {
    setSelectedReportId(report.id);
    setDetailOpen(true);
  }, []);

  const handleAction = useCallback((report: Report) => {
    setActionReport(report);
    setDetailOpen(false);
    setActionDialogOpen(true);
  }, []);

  const handleActionConfirm = async (
    action: "경고" | "정지" | "무혐의",
    adminNote: string
  ) => {
    if (!actionReport) return;

    try {
      const {
        data: { user: adminUser },
      } = await supabase.auth.getUser();
      if (!adminUser) {
        toast.error("관리자 인증 정보를 확인할 수 없습니다");
        return;
      }

      await processReport(
        supabase,
        actionReport.id,
        action,
        adminNote,
        adminUser.id
      );
      toast.success("신고가 처리되었습니다");
      // 목록 새로고침
      setPage(page);
    } catch (error) {
      toast.error("신고 처리에 실패했습니다");
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="신고 관리"
        description="접수된 신고를 확인하고 처리할 수 있습니다"
      />

      <ReportTable onSelectReport={handleSelectReport} />

      <ReportDetailPanel
        open={detailOpen}
        onOpenChange={setDetailOpen}
        reportId={selectedReportId}
        onAction={handleAction}
      />

      <ReportActionDialog
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        report={actionReport}
        onConfirm={handleActionConfirm}
      />
    </div>
  );
}

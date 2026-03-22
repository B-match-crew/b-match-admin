import { create } from "zustand";
import type { Report, ReportStatus } from "@/src/entities/report/types";

interface ReportStore {
  reports: Report[];
  isLoading: boolean;
  totalCount: number;
  page: number;
  statusFilter: "all" | ReportStatus;
  selectedReport: Report | null;

  setReports: (reports: Report[], totalCount: number) => void;
  setLoading: (isLoading: boolean) => void;
  setStatusFilter: (status: "all" | ReportStatus) => void;
  setPage: (page: number) => void;
  setSelectedReport: (report: Report | null) => void;
  resetFilters: () => void;
}

export const useReportStore = create<ReportStore>((set) => ({
  reports: [],
  isLoading: false,
  totalCount: 0,
  page: 1,
  statusFilter: "all",
  selectedReport: null,

  setReports: (reports, totalCount) => set({ reports, totalCount }),
  setLoading: (isLoading) => set({ isLoading }),
  setStatusFilter: (status) => set({ statusFilter: status, page: 1 }),
  setPage: (page) => set({ page }),
  setSelectedReport: (report) => set({ selectedReport: report }),
  resetFilters: () => set({ statusFilter: "all", page: 1 }),
}));

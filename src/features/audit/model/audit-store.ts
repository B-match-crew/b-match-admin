import { create } from "zustand";
import type { AuditLog, AuditAction, AuditTargetType } from "@/src/entities/audit/types";

interface AuditStore {
  logs: AuditLog[];
  isLoading: boolean;
  totalCount: number;
  page: number;
  actionFilter: "all" | AuditAction;
  targetFilter: "all" | AuditTargetType;
  selectedLog: AuditLog | null;

  setLogs: (logs: AuditLog[], totalCount: number) => void;
  setLoading: (isLoading: boolean) => void;
  setActionFilter: (action: "all" | AuditAction) => void;
  setTargetFilter: (target: "all" | AuditTargetType) => void;
  setPage: (page: number) => void;
  setSelectedLog: (log: AuditLog | null) => void;
  resetFilters: () => void;
}

export const useAuditStore = create<AuditStore>((set) => ({
  logs: [],
  isLoading: false,
  totalCount: 0,
  page: 1,
  actionFilter: "all",
  targetFilter: "all",
  selectedLog: null,

  setLogs: (logs, totalCount) => set({ logs, totalCount }),
  setLoading: (isLoading) => set({ isLoading }),
  setActionFilter: (action) => set({ actionFilter: action, page: 1 }),
  setTargetFilter: (target) => set({ targetFilter: target, page: 1 }),
  setPage: (page) => set({ page }),
  setSelectedLog: (log) => set({ selectedLog: log }),
  resetFilters: () =>
    set({ actionFilter: "all", targetFilter: "all", page: 1 }),
}));

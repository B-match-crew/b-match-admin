import { create } from "zustand";
import type {
  SettlementRequest,
  RefundRequest,
  SettlementStatus,
} from "@/src/entities/settlement/types";

type TabType = "withdrawal" | "refund";

interface SettlementStore {
  activeTab: TabType;
  settlements: SettlementRequest[];
  refunds: RefundRequest[];
  isLoading: boolean;
  totalCount: number;
  page: number;
  statusFilter: "all" | SettlementStatus;
  selectedIds: number[];

  setActiveTab: (tab: TabType) => void;
  setSettlements: (settlements: SettlementRequest[], totalCount: number) => void;
  setRefunds: (refunds: RefundRequest[], totalCount: number) => void;
  setLoading: (isLoading: boolean) => void;
  setStatusFilter: (status: "all" | SettlementStatus) => void;
  setPage: (page: number) => void;
  toggleSelect: (id: number) => void;
  selectAll: (ids: number[]) => void;
  clearSelection: () => void;
  resetFilters: () => void;
}

export const useSettlementStore = create<SettlementStore>((set) => ({
  activeTab: "withdrawal",
  settlements: [],
  refunds: [],
  isLoading: false,
  totalCount: 0,
  page: 1,
  statusFilter: "all",
  selectedIds: [],

  setActiveTab: (activeTab) =>
    set({ activeTab, page: 1, statusFilter: "all", selectedIds: [] }),
  setSettlements: (settlements, totalCount) => set({ settlements, totalCount }),
  setRefunds: (refunds, totalCount) => set({ refunds, totalCount }),
  setLoading: (isLoading) => set({ isLoading }),
  setStatusFilter: (status) => set({ statusFilter: status, page: 1 }),
  setPage: (page) => set({ page }),
  toggleSelect: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((i) => i !== id)
        : [...state.selectedIds, id],
    })),
  selectAll: (ids) => set({ selectedIds: ids }),
  clearSelection: () => set({ selectedIds: [] }),
  resetFilters: () => set({ statusFilter: "all", page: 1, selectedIds: [] }),
}));

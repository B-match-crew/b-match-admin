import { create } from "zustand";
import type { SettlementRequest, SettlementStatus, RefundRequest } from "@/src/entities/settlement/types";

interface SettlementStore {
  // 호스트 정산
  settlements: SettlementRequest[];
  settlementTotalCount: number;
  settlementPage: number;
  settlementStatusFilter: "all" | SettlementStatus;
  selectedSettlementIds: number[];

  // 게스트 환불
  refunds: RefundRequest[];
  refundTotalCount: number;
  refundPage: number;
  refundStatusFilter: "all" | SettlementStatus;
  selectedRefundIds: number[];

  isLoading: boolean;

  // Actions
  setSettlements: (settlements: SettlementRequest[], totalCount: number) => void;
  setSettlementPage: (page: number) => void;
  setSettlementStatusFilter: (status: "all" | SettlementStatus) => void;
  toggleSettlementSelection: (id: number) => void;
  selectAllSettlements: (ids: number[]) => void;
  clearSettlementSelection: () => void;

  setRefunds: (refunds: RefundRequest[], totalCount: number) => void;
  setRefundPage: (page: number) => void;
  setRefundStatusFilter: (status: "all" | SettlementStatus) => void;
  toggleRefundSelection: (id: number) => void;
  selectAllRefunds: (ids: number[]) => void;
  clearRefundSelection: () => void;

  setLoading: (isLoading: boolean) => void;
}

export const useSettlementStore = create<SettlementStore>((set, get) => ({
  settlements: [],
  settlementTotalCount: 0,
  settlementPage: 1,
  settlementStatusFilter: "all",
  selectedSettlementIds: [],

  refunds: [],
  refundTotalCount: 0,
  refundPage: 1,
  refundStatusFilter: "all",
  selectedRefundIds: [],

  isLoading: false,

  setSettlements: (settlements, totalCount) =>
    set({ settlements, settlementTotalCount: totalCount }),
  setSettlementPage: (page) => set({ settlementPage: page }),
  setSettlementStatusFilter: (status) =>
    set({ settlementStatusFilter: status, settlementPage: 1, selectedSettlementIds: [] }),
  toggleSettlementSelection: (id) => {
    const current = get().selectedSettlementIds;
    set({
      selectedSettlementIds: current.includes(id)
        ? current.filter((i) => i !== id)
        : [...current, id],
    });
  },
  selectAllSettlements: (ids) => set({ selectedSettlementIds: ids }),
  clearSettlementSelection: () => set({ selectedSettlementIds: [] }),

  setRefunds: (refunds, totalCount) =>
    set({ refunds, refundTotalCount: totalCount }),
  setRefundPage: (page) => set({ refundPage: page }),
  setRefundStatusFilter: (status) =>
    set({ refundStatusFilter: status, refundPage: 1, selectedRefundIds: [] }),
  toggleRefundSelection: (id) => {
    const current = get().selectedRefundIds;
    set({
      selectedRefundIds: current.includes(id)
        ? current.filter((i) => i !== id)
        : [...current, id],
    });
  },
  selectAllRefunds: (ids) => set({ selectedRefundIds: ids }),
  clearRefundSelection: () => set({ selectedRefundIds: [] }),

  setLoading: (isLoading) => set({ isLoading }),
}));

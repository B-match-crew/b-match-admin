import { create } from "zustand";
import type {
  FinanceSummary,
  DailyTransaction,
} from "../api/finance-api";

interface FinanceStore {
  summary: FinanceSummary | null;
  dailyTransactions: DailyTransaction[];
  isLoading: boolean;
  period: number;

  setSummary: (summary: FinanceSummary) => void;
  setDailyTransactions: (data: DailyTransaction[]) => void;
  setLoading: (isLoading: boolean) => void;
  setPeriod: (days: number) => void;
}

export const useFinanceStore = create<FinanceStore>((set) => ({
  summary: null,
  dailyTransactions: [],
  isLoading: false,
  period: 30,

  setSummary: (summary) => set({ summary }),
  setDailyTransactions: (data) => set({ dailyTransactions: data }),
  setLoading: (isLoading) => set({ isLoading }),
  setPeriod: (period) => set({ period }),
}));

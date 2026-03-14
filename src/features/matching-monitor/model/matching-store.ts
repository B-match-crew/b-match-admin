import { create } from "zustand";
import type { Matching } from "@/src/entities/matching/types";

interface MatchingStore {
  matchings: Matching[];
  isLoading: boolean;
  totalCount: number;
  page: number;
  searchQuery: string;
  statusFilter: "all" | "모집중" | "마감" | "종료" | "취소";

  setMatchings: (matchings: Matching[], totalCount: number) => void;
  setLoading: (isLoading: boolean) => void;
  setSearch: (query: string) => void;
  setStatusFilter: (status: "all" | "모집중" | "마감" | "종료" | "취소") => void;
  setPage: (page: number) => void;
  resetFilters: () => void;
}

export const useMatchingStore = create<MatchingStore>((set) => ({
  matchings: [],
  isLoading: false,
  totalCount: 0,
  page: 1,
  searchQuery: "",
  statusFilter: "all",

  setMatchings: (matchings, totalCount) => set({ matchings, totalCount }),
  setLoading: (isLoading) => set({ isLoading }),
  setSearch: (query) => set({ searchQuery: query, page: 1 }),
  setStatusFilter: (status) => set({ statusFilter: status, page: 1 }),
  setPage: (page) => set({ page }),
  resetFilters: () => set({ searchQuery: "", statusFilter: "all", page: 1 }),
}));

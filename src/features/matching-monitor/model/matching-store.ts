import { create } from "zustand";
import type { Match, MatchStatus } from "@/src/entities/matching/types";

interface MatchingStore {
  matches: Match[];
  isLoading: boolean;
  totalCount: number;
  page: number;
  searchQuery: string;
  statusFilter: "all" | MatchStatus;

  setMatches: (matches: Match[], totalCount: number) => void;
  setLoading: (isLoading: boolean) => void;
  setSearch: (query: string) => void;
  setStatusFilter: (status: "all" | MatchStatus) => void;
  setPage: (page: number) => void;
  resetFilters: () => void;
}

export const useMatchingStore = create<MatchingStore>((set) => ({
  matches: [],
  isLoading: false,
  totalCount: 0,
  page: 1,
  searchQuery: "",
  statusFilter: "all",

  setMatches: (matches, totalCount) => set({ matches, totalCount }),
  setLoading: (isLoading) => set({ isLoading }),
  setSearch: (query) => set({ searchQuery: query, page: 1 }),
  setStatusFilter: (status) => set({ statusFilter: status, page: 1 }),
  setPage: (page) => set({ page }),
  resetFilters: () => set({ searchQuery: "", statusFilter: "all", page: 1 }),
}));

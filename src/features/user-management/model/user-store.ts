import { create } from "zustand";
import type { User, UserStatus } from "@/src/entities/user/types";

interface UserFilters {
  status: "all" | UserStatus;
  role: "all" | "user" | "host";
}

interface UserStore {
  users: User[];
  isLoading: boolean;
  totalCount: number;
  page: number;
  searchQuery: string;
  filters: UserFilters;

  setUsers: (users: User[], totalCount: number) => void;
  setLoading: (isLoading: boolean) => void;
  setSearch: (query: string) => void;
  setFilter: <K extends keyof UserFilters>(key: K, value: UserFilters[K]) => void;
  setPage: (page: number) => void;
  resetFilters: () => void;
}

const initialFilters: UserFilters = {
  status: "all",
  role: "all",
};

export const useUserStore = create<UserStore>((set) => ({
  users: [],
  isLoading: false,
  totalCount: 0,
  page: 1,
  searchQuery: "",
  filters: { ...initialFilters },

  setUsers: (users, totalCount) => set({ users, totalCount }),
  setLoading: (isLoading) => set({ isLoading }),
  setSearch: (query) => set({ searchQuery: query, page: 1 }),
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
      page: 1,
    })),
  setPage: (page) => set({ page }),
  resetFilters: () => set({ filters: { ...initialFilters }, searchQuery: "", page: 1 }),
}));

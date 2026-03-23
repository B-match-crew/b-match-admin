import { create } from "zustand";
import type { BadticketEvent } from "@/src/entities/battiket/types";

interface BatticketStore {
  isLoading: boolean;
  totalCount: number;
  page: number;
  searchQuery: string;
  selectedUserId: string | null;
  selectedUserNickname: string | null;
  events: BadticketEvent[];
  eventsLoading: boolean;
  eventsTotalCount: number;
  eventsPage: number;

  setLoading: (isLoading: boolean) => void;
  setTotalCount: (count: number) => void;
  setPage: (page: number) => void;
  setSearch: (query: string) => void;
  setSelectedUser: (userId: string | null, nickname: string | null) => void;
  setEvents: (events: BadticketEvent[], totalCount: number) => void;
  setEventsLoading: (isLoading: boolean) => void;
  setEventsPage: (page: number) => void;
  resetFilters: () => void;
}

export const useBatticketStore = create<BatticketStore>((set) => ({
  isLoading: false,
  totalCount: 0,
  page: 1,
  searchQuery: "",
  selectedUserId: null,
  selectedUserNickname: null,
  events: [],
  eventsLoading: false,
  eventsTotalCount: 0,
  eventsPage: 1,

  setLoading: (isLoading) => set({ isLoading }),
  setTotalCount: (totalCount) => set({ totalCount }),
  setPage: (page) => set({ page }),
  setSearch: (query) => set({ searchQuery: query, page: 1 }),
  setSelectedUser: (userId, nickname) =>
    set({
      selectedUserId: userId,
      selectedUserNickname: nickname,
      events: [],
      eventsPage: 1,
    }),
  setEvents: (events, eventsTotalCount) => set({ events, eventsTotalCount }),
  setEventsLoading: (eventsLoading) => set({ eventsLoading }),
  setEventsPage: (eventsPage) => set({ eventsPage }),
  resetFilters: () => set({ searchQuery: "", page: 1 }),
}));

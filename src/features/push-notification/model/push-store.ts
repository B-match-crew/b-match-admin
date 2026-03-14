import { create } from "zustand";
import type { PushNotification } from "@/src/entities/notification/types";

interface PushStore {
  history: PushNotification[];
  total: number;
  page: number;
  isLoading: boolean;
  isSending: boolean;
  activeTab: string;
  setHistory: (history: PushNotification[], total: number) => void;
  setPage: (page: number) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsSending: (isSending: boolean) => void;
  setActiveTab: (tab: string) => void;
  addNotification: (notification: PushNotification) => void;
}

export const usePushStore = create<PushStore>((set) => ({
  history: [],
  total: 0,
  page: 1,
  isLoading: false,
  isSending: false,
  activeTab: "compose",
  setHistory: (history, total) => set({ history, total }),
  setPage: (page) => set({ page }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsSending: (isSending) => set({ isSending }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  addNotification: (notification) =>
    set((state) => ({
      history: [notification, ...state.history],
      total: state.total + 1,
    })),
}));

import { create } from "zustand";
import type { EventSummaryItem, FunnelStep } from "../api/analytics-api";

interface AnalyticsStore {
  events: EventSummaryItem[];
  funnel: FunnelStep[];
  isLoading: boolean;
  setEvents: (events: EventSummaryItem[]) => void;
  setFunnel: (funnel: FunnelStep[]) => void;
  setIsLoading: (isLoading: boolean) => void;
}

export const useAnalyticsStore = create<AnalyticsStore>((set) => ({
  events: [],
  funnel: [],
  isLoading: false,
  setEvents: (events) => set({ events }),
  setFunnel: (funnel) => set({ funnel }),
  setIsLoading: (isLoading) => set({ isLoading }),
}));

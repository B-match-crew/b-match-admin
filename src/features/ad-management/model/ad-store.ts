import { create } from "zustand";
import type { Advertisement, AdLocation } from "@/src/entities/advertisement/types";
import type { AdPerformanceItem } from "../api/ad-api";

interface AdStore {
  ads: Advertisement[];
  total: number;
  page: number;
  typeFilter: string;
  statusFilter: string;
  isLoading: boolean;
  selectedAd: Advertisement | null;
  locations: AdLocation[];
  performance: AdPerformanceItem[];
  setAds: (ads: Advertisement[], total: number) => void;
  setPage: (page: number) => void;
  setTypeFilter: (type: string) => void;
  setStatusFilter: (status: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  setSelectedAd: (ad: Advertisement | null) => void;
  setLocations: (locations: AdLocation[]) => void;
  setPerformance: (performance: AdPerformanceItem[]) => void;
  updateAd: (updated: Advertisement) => void;
}

export const useAdStore = create<AdStore>((set) => ({
  ads: [],
  total: 0,
  page: 1,
  typeFilter: "",
  statusFilter: "",
  isLoading: false,
  selectedAd: null,
  locations: [],
  performance: [],
  setAds: (ads, total) => set({ ads, total }),
  setPage: (page) => set({ page }),
  setTypeFilter: (typeFilter) => set({ typeFilter, page: 1 }),
  setStatusFilter: (statusFilter) => set({ statusFilter, page: 1 }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setSelectedAd: (selectedAd) => set({ selectedAd }),
  setLocations: (locations) => set({ locations }),
  setPerformance: (performance) => set({ performance }),
  updateAd: (updated) =>
    set((state) => ({
      ads: state.ads.map((ad) => (ad.id === updated.id ? updated : ad)),
      selectedAd:
        state.selectedAd?.id === updated.id ? updated : state.selectedAd,
    })),
}));

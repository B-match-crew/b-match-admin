import { create } from "zustand";
import type { BattiketConfigMap } from "../api/battiket-config-api";

interface BattiketStore {
  config: BattiketConfigMap;
  isLoading: boolean;
  isSaving: boolean;
  setConfig: (config: BattiketConfigMap) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsSaving: (isSaving: boolean) => void;
}

export const useBattiketStore = create<BattiketStore>((set) => ({
  config: {},
  isLoading: false,
  isSaving: false,
  setConfig: (config) => set({ config }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsSaving: (isSaving) => set({ isSaving }),
}));

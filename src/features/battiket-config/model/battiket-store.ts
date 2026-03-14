import { create } from "zustand";
import type { BattiketConfig } from "@/src/entities/battiket/types";

interface BattiketStore {
  config: BattiketConfig | null;
  isLoading: boolean;
  isSaving: boolean;
  showConfirmDialog: boolean;
  setConfig: (config: BattiketConfig | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsSaving: (isSaving: boolean) => void;
  setShowConfirmDialog: (show: boolean) => void;
}

export const useBattiketStore = create<BattiketStore>((set) => ({
  config: null,
  isLoading: false,
  isSaving: false,
  showConfirmDialog: false,
  setConfig: (config) => set({ config }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsSaving: (isSaving) => set({ isSaving }),
  setShowConfirmDialog: (showConfirmDialog) => set({ showConfirmDialog }),
}));

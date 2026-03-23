import { create } from "zustand";
import type { AppConfig } from "@/src/entities/config/types";
import type { SystemStatus } from "../api/settings-api";

interface SettingsStore {
  configs: AppConfig[];
  systemStatus: SystemStatus | null;
  isLoading: boolean;
  editingKey: string | null;
  editingValue: string;

  setConfigs: (configs: AppConfig[]) => void;
  setSystemStatus: (status: SystemStatus) => void;
  setLoading: (isLoading: boolean) => void;
  startEditing: (key: string, value: string) => void;
  setEditingValue: (value: string) => void;
  cancelEditing: () => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  configs: [],
  systemStatus: null,
  isLoading: false,
  editingKey: null,
  editingValue: "",

  setConfigs: (configs) => set({ configs }),
  setSystemStatus: (systemStatus) => set({ systemStatus }),
  setLoading: (isLoading) => set({ isLoading }),
  startEditing: (key, value) => set({ editingKey: key, editingValue: value }),
  setEditingValue: (editingValue) => set({ editingValue }),
  cancelEditing: () => set({ editingKey: null, editingValue: "" }),
}));

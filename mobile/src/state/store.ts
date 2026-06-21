import { create } from "zustand";

import { clearHistory as clearStoredHistory, loadHistory } from "../lib/storage";
import { HistoryItem, ReportType } from "../types";

type AppState = {
  reportType: ReportType;
  history: HistoryItem[];

  setReportType: (reportType: ReportType) => void;
  hydrateHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
};

export const useStore = create<AppState>((set) => ({
  reportType: "overall",
  history: [],

  setReportType: (reportType) => set({ reportType }),

  hydrateHistory: async () => {
    const history = await loadHistory();
    set({ history });
  },

  clearHistory: async () => {
    await clearStoredHistory();
    set({ history: [] });
  },
}));

import { create } from "zustand";

import { analyzeJournal, ApiError, inspectColumns, wakeBackend } from "../lib/api";
import { clearHistory as clearStoredHistory, loadHistory, saveHistory } from "../lib/storage";
import {
  AnalysisResponse,
  HistoryItem,
  InspectResponse,
  JournalSource,
  ReportType,
} from "../types";

type Status = "idle" | "waking" | "inspecting" | "analyzing";

type AppState = {
  source: JournalSource | null;
  reportType: ReportType;
  sheetName: string;
  columnMappings: Record<string, string>;
  status: Status;
  error: string | null;
  inspect: InspectResponse | null;
  result: AnalysisResponse | null;
  history: HistoryItem[];

  setSource: (source: JournalSource | null) => void;
  setReportType: (reportType: ReportType) => void;
  setSheetName: (sheetName: string) => void;
  setColumnMapping: (canonical: string, source: string) => void;
  setColumnMappings: (mappings: Record<string, string>) => void;
  clearError: () => void;

  runInspect: () => Promise<InspectResponse>;
  runAnalyze: () => Promise<AnalysisResponse>;

  hydrateHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
};

function sourceLabel(source: JournalSource | null): string {
  if (!source) return "Unknown source";
  return source.kind === "file" ? source.name : source.url;
}

function buildForm(state: AppState): FormData {
  const { source, reportType, sheetName, columnMappings } = state;
  const form = new FormData();
  form.append("report_type", reportType);
  form.append("sheet_name", String(Number(sheetName) || 0));

  const mappings = Object.fromEntries(
    Object.entries(columnMappings).filter(([, value]) => value.trim().length > 0),
  );
  if (Object.keys(mappings).length > 0) {
    form.append("column_mappings", JSON.stringify(mappings));
  }

  if (source?.kind === "link") {
    form.append("file_url", source.url.trim());
  } else if (source?.kind === "file") {
    form.append(
      "upload",
      { uri: source.uri, name: source.name, type: source.mimeType } as unknown as Blob,
    );
  }

  return form;
}

function messageFromError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.debugMessage ? `${error.message}\n\n${error.debugMessage}` : error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

export const useStore = create<AppState>((set, get) => ({
  source: null,
  reportType: "overall",
  sheetName: "0",
  columnMappings: {},
  status: "idle",
  error: null,
  inspect: null,
  result: null,
  history: [],

  setSource: (source) => set({ source, error: null, inspect: null }),
  setReportType: (reportType) => set({ reportType }),
  setSheetName: (sheetName) => set({ sheetName }),
  setColumnMapping: (canonical, source) =>
    set((state) => ({ columnMappings: { ...state.columnMappings, [canonical]: source } })),
  setColumnMappings: (mappings) => set({ columnMappings: mappings }),
  clearError: () => set({ error: null }),

  runInspect: async () => {
    const state = get();
    if (!state.source) throw new ApiError("Pick a file or paste a link first.");
    set({ error: null, status: "waking" });
    try {
      await wakeBackend(() => set({ status: "waking" }));
      set({ status: "inspecting" });
      const inspect = await inspectColumns(buildForm(get()));
      set({ inspect, status: "idle" });
      return inspect;
    } catch (error) {
      set({ error: messageFromError(error), status: "idle" });
      throw error;
    }
  },

  runAnalyze: async () => {
    const state = get();
    if (!state.source) throw new ApiError("Pick a file or paste a link first.");
    set({ error: null, status: "waking" });
    try {
      await wakeBackend(() => set({ status: "waking" }));
      set({ status: "analyzing" });
      const result = await analyzeJournal(buildForm(get()));

      const historyItem: HistoryItem = {
        id: result.report_id,
        createdAt: Date.now(),
        reportType: result.report_type,
        sourceLabel: sourceLabel(get().source),
        rowsProcessed: result.rows_processed,
        stats: result.stats,
        downloadUrl: result.download_url,
      };
      const history = [historyItem, ...get().history.filter((item) => item.id !== historyItem.id)];
      set({ result, history, status: "idle" });
      void saveHistory(history);
      return result;
    } catch (error) {
      set({ error: messageFromError(error), status: "idle" });
      throw error;
    }
  },

  hydrateHistory: async () => {
    const history = await loadHistory();
    set({ history });
  },

  clearHistory: async () => {
    await clearStoredHistory();
    set({ history: [] });
  },
}));

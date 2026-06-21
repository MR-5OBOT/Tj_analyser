/** Shared types for the TJ Analyser app. */

export type ReportType = "overall" | "weekly";

export type StatValue = string | number;

export type HistoryItem = {
  id: string;
  createdAt: number;
  reportType: string;
  sourceLabel: string;
  rowsProcessed: number;
  stats: Record<string, StatValue>;
  downloadUrl: string;
};

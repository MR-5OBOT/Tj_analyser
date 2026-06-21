/** Shared types for the TJ Analyser app, mirroring the backend response models. */

export const CANONICAL_COLUMNS = [
  "trade_date",
  "trade_day",
  "asset",
  "entry_time",
  "exit_time",
  "position_size",
  "outcome",
  "rr",
  "risk_amount",
  "reward_amount",
  "stop_loss_points",
  "session",
  "setup",
  "notes",
] as const;

export type CanonicalColumn = (typeof CANONICAL_COLUMNS)[number];

export type ReportType = "overall" | "weekly";

export type StatValue = string | number;

export type AnalysisResponse = {
  report_id: string;
  report_type: string;
  stats: Record<string, StatValue>;
  detected_mappings: Record<string, string>;
  source_columns: string[];
  unmapped_columns: string[];
  rows_processed: number;
  download_url: string;
};

export type InspectResponse = {
  source_columns: string[];
  detected_mappings: Record<string, string>;
  unmapped_columns: string[];
  missing_required: string[];
};

export type FileSource = {
  kind: "file";
  uri: string;
  name: string;
  mimeType: string;
};

export type LinkSource = {
  kind: "link";
  url: string;
};

export type JournalSource = FileSource | LinkSource;

export type HistoryItem = {
  id: string;
  createdAt: number;
  reportType: string;
  sourceLabel: string;
  rowsProcessed: number;
  stats: Record<string, StatValue>;
  downloadUrl: string;
};

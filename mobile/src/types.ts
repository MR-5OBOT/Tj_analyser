export type ReportStatValue = string | number;

export type GeneratedReportResponse = {
  report_id: string;
  report_type: string;
  stats: Record<string, ReportStatValue>;
  rows_processed: number;
  download_url: string;
};

export type AnalysisResponse = GeneratedReportResponse & {
  detected_mappings: Record<string, string>;
};

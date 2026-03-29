export type AnalysisResponse = {
  report_id: string;
  report_type: string;
  stats: Record<string, string | number>;
  detected_mappings: Record<string, string>;
  rows_processed: number;
  download_url: string;
};

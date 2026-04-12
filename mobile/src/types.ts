export type ReportStatValue = string | number;

export type GeneratedReportResponse = {
  report_id: string;
  report_type: string;
  stats: Record<string, ReportStatValue>;
  rows_processed: number;
  download_url: string;
  image_url?: string | null;
};

export type AnalysisResponse = GeneratedReportResponse & {
  detected_mappings: Record<string, string>;
};

export type ExecutionTradeSide = "long" | "short";

export type ExecutionTradePayload = {
  asset: string;
  side: ExecutionTradeSide;
  entry_time: string;
  exit_time: string;
  setup: string;
  notes: string;
  size: number | null;
  risk_amount: number | null;
  entry_price: number | null;
  exit_price: number | null;
  pnl_amount: number | null;
  rr: number | null;
};

export type ExecutionReportPayload = {
  report_date: string;
  title: string;
  account_name: string;
  account_cycle: string;
  account_type: string;
  platform: string;
  session: string;
  base_currency: string;
  opening_balance: number | null;
  closing_balance: number | null;
  daily_risk_limit: number | null;
  notes: string;
  trades: ExecutionTradePayload[];
};

export type ExecutionReportResponse = GeneratedReportResponse;

export type ExecutionTradeDraft = {
  id: string;
  asset: string;
  side: ExecutionTradeSide;
  entryTime: string;
  exitTime: string;
  size: string;
  riskAmount: string;
  entryPrice: string;
  exitPrice: string;
  pnlAmount: string;
  rr: string;
  setup: string;
  notes: string;
};

export type ExecutionReportDraft = {
  reportDate: string;
  title: string;
  accountName: string;
  accountCycle: string;
  accountType: string;
  platform: string;
  session: string;
  baseCurrency: string;
  openingBalance: string;
  closingBalance: string;
  dailyRiskLimit: string;
  notes: string;
  trades: ExecutionTradeDraft[];
};

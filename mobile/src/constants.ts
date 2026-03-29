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

export const INITIAL_MAPPINGS: Record<CanonicalColumn, string> = {
  trade_date: "",
  trade_day: "",
  asset: "",
  entry_time: "",
  exit_time: "",
  position_size: "",
  outcome: "",
  rr: "",
  risk_amount: "",
  reward_amount: "",
  stop_loss_points: "",
  session: "",
  setup: "",
  notes: "",
};

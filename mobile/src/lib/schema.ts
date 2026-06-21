import { SchemaResponse } from "./api";

/**
 * Bundled copy of the backend column schema (config.py FIELD_LABELS + COLUMN_ALIASES).
 *
 * Used so the Column guide works with no backend during UI-first development. When the
 * backend is redeployed, the guide can switch back to `fetchSchema()` from ./api.
 * Keep in sync with backend `config.py` if the accepted names change.
 */
export const LOCAL_SCHEMA: SchemaResponse = {
  columns: [
    { field: "trade_date", label: "Date", description: "", accepted_names: ["date", "trade_date", "timestamp"] },
    { field: "trade_day", label: "Day", description: "", accepted_names: ["day", "trade_day", "weekday"] },
    { field: "asset", label: "Asset", description: "", accepted_names: ["asset", "symbol", "ticker"] },
    { field: "entry_time", label: "Entry time", description: "", accepted_names: ["entry_time", "entry", "time"] },
    { field: "exit_time", label: "Exit time", description: "", accepted_names: ["exit_time", "exit", "time_out"] },
    { field: "position_size", label: "Position size", description: "", accepted_names: ["size", "position_size", "contracts"] },
    { field: "outcome", label: "Outcome", description: "", accepted_names: ["outcome", "result", "win_loss"] },
    { field: "rr", label: "R / R-multiple", description: "", accepted_names: ["rr", "r", "r_multiple"] },
    { field: "risk_amount", label: "Risk", description: "", accepted_names: ["risk", "risk_amount", "risked"] },
    { field: "reward_amount", label: "Reward", description: "", accepted_names: ["reward", "reward_amount", "gain"] },
    { field: "stop_loss_points", label: "Stop-loss", description: "", accepted_names: ["sl", "stop_loss", "sl_points"] },
    { field: "session", label: "Session", description: "", accepted_names: ["session", "market_session", "kill_zone"] },
    { field: "setup", label: "Setup", description: "", accepted_names: ["setup", "strategy", "playbook"] },
    { field: "notes", label: "Notes", description: "", accepted_names: ["notes", "comment", "journal"] },
  ],
  required_one_of: ["outcome", "rr"],
  note:
    "Name each column one of its accepted names (capitalization and spacing don't matter). " +
    "You must include at least an 'outcome' or an 'rr' column — without one, analysis can't run. " +
    "Every other field is optional and unlocks more charts.",
};

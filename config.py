"""Shared configuration for the TJ Analyser mobile and backend app."""

from typing import Final

# Plot styling
PLOT_STYLE: Final[str] = "dark_background"

COLORS: Final[dict[str, str]] = {
    "primary": "#466963",
    "secondary": "#476A64",
    "win": "#466963",
    "loss": "#C05478",
    "breakeven": "#607250",
    "neutral": "#333333",
    "gray": "#515151",
    "text": "gray",
}

PLOT_DEFAULTS: Final[dict] = {
    "figsize": (8, 6),
    "rotation": 0,
    "labelsize": 10,
    "linewidth": 2,
    "markersize": 8,
    "edgecolor": "black",
    "edge_linewidth": 1.5,
}

# Trading constants
DAY_ORDER: Final[list[str]] = ["monday", "tuesday", "wednesday", "thursday", "friday"]

OUTCOME_LABELS: Final[dict[str, str]] = {
    "win": "WIN",
    "loss": "LOSS",
    "breakeven": "BE",
}

CANONICAL_COLUMNS: Final[dict[str, str]] = {
    "trade_date": "Trade date or timestamp for the trade",
    "trade_day": "Day name for the trade; derived from trade_date when possible",
    "asset": "Instrument, ticker, symbol, or market name",
    "entry_time": "Entry time in any parseable format",
    "exit_time": "Exit time in any parseable format",
    "position_size": "Position size, contracts, lots, or shares",
    "outcome": "Trade outcome such as WIN, LOSS, or BE",
    "rr": "R-multiple or risk-reward result for the trade",
    "risk_amount": "Risk taken on the trade in account currency or points",
    "reward_amount": "Reward made on the trade in account currency or points",
    "stop_loss_points": "Stop-loss size in points, ticks, or pips",
    "session": "Trading session or market session label",
    "setup": "Setup, strategy, or playbook name",
    "notes": "Free-form trade notes",
}

# Human-friendly labels for each field, shown on the upload screen via /api/schema.
FIELD_LABELS: Final[dict[str, str]] = {
    "trade_date": "Date",
    "trade_day": "Day",
    "asset": "Asset",
    "entry_time": "Entry time",
    "exit_time": "Exit time",
    "position_size": "Position size",
    "outcome": "Outcome",
    "rr": "R / R-multiple",
    "risk_amount": "Risk",
    "reward_amount": "Reward",
    "stop_loss_points": "Stop-loss",
    "session": "Session",
    "setup": "Setup",
    "notes": "Notes",
}

# Each field accepts exactly these names (matched case/spacing/punctuation-insensitively).
# The upload screen shows these to the user: name your columns one of these or analysis
# can't run. Keep to 3 clear examples per field.
COLUMN_ALIASES: Final[dict[str, list[str]]] = {
    "trade_date": ["date", "trade_date", "timestamp"],
    "trade_day": ["day", "trade_day", "weekday"],
    "asset": ["asset", "symbol", "ticker"],
    "entry_time": ["entry_time", "entry", "time"],
    "exit_time": ["exit_time", "exit", "time_out"],
    "position_size": ["size", "position_size", "contracts"],
    "outcome": ["outcome", "result", "win_loss"],
    "rr": ["rr", "r", "r/r", "r_multiple"],
    "risk_amount": ["risk", "risk_amount", "risked"],
    "reward_amount": ["reward", "reward_amount", "gain"],
    "stop_loss_points": ["sl", "stop_loss", "sl_points"],
    "session": ["session", "market_session", "kill_zone"],
    "setup": ["setup", "strategy", "playbook"],
    "notes": ["notes", "comment", "journal"],
}

OUTCOME_VALUE_MAP: Final[dict[str, str]] = {
    "win": "WIN",
    "w": "WIN",
    "winner": "WIN",
    "profit": "WIN",
    "green": "WIN",
    "1": "WIN",
    "loss": "LOSS",
    "l": "LOSS",
    "loser": "LOSS",
    "red": "LOSS",
    "-1": "LOSS",
    "be": "BE",
    "b/e": "BE",
    "break even": "BE",
    "breakeven": "BE",
    "scratch": "BE",
    "flat": "BE",
    "0": "BE",
}

MINIMUM_REQUIRED_COLUMNS: Final[list[str]] = ["outcome"]

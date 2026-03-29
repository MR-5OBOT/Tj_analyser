"""Configuration file for Tj_analyser project."""

import os
from typing import Final

# Data URLs
DATA_URL_WEEKLY: Final[str] = os.getenv(
    "DATA_URL_WEEKLY",
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=1682820713&single=true&output=csv",
)

DATA_URL_OVERALL: Final[str] = os.getenv(
    "DATA_URL_OVERALL",
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=1587441688&single=true&output=csv",
)

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

DEFAULT_JOURNAL_CONFIG_PATH: Final[str] = "journal_config.toml"

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

COLUMN_ALIASES: Final[dict[str, list[str]]] = {
    "trade_date": [
        "trade_date",
        "date",
        "data",
    ],
    "trade_day": ["trade_day", "day", "weekday"],
    "asset": ["asset", "symbol", "ticker"],
    "entry_time": ["entry_time", "entry", "entry time"],
    "exit_time": ["exit_time", "exit", "exit time"],
    "position_size": [
        "position_size",
        "size",
        "contracts",
    ],
    "outcome": ["outcome", "result", "win_loss"],
    "rr": [
        "rr",
        "r/r",
        "r_multiple",
    ],
    "risk_amount": ["risk_amount", "risk_value", "risk"],
    "reward_amount": [
        "reward_amount",
        "reward_value",
        "reward",
    ],
    "stop_loss_points": [
        "stop_loss_points",
        "sl_points",
        "sl",
    ],
    "session": ["session", "market_session", "session_name"],
    "setup": ["setup", "strategy", "playbook"],
    "notes": ["notes", "comment", "comments"],
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

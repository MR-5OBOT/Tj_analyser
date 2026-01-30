"""Configuration file for Tj_analyser project."""

import os
from typing import Final

# Data URLs
DATA_URL_WEEKLY: Final[str] = os.getenv(
    "DATA_URL_WEEKLY",
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=1682820713&single=true&output=csv"
)

DATA_URL_OVERALL: Final[str] = os.getenv(
    "DATA_URL_OVERALL",
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=1587441688&single=true&output=csv"
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

REQUIRED_COLUMNS: Final[list[str]] = [
    "date",
    "day",
    "symbol",
    "entry_time",
    "contracts",
    "outcome",
    "R/R",
]

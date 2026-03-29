import numpy as np
import pandas as pd

from helpers.data_cleaning import clean_numeric_series


def normalize_label(value: str) -> str:
    """Normalize labels for resilient column matching."""
    return (
        str(value)
        .strip()
        .lower()
        .replace("/", "_")
        .replace("-", "_")
        .replace(" ", "_")
    )


def has_non_empty(df: pd.DataFrame, column: str) -> bool:
    """Check whether a DataFrame column exists and contains non-empty values."""
    return column in df.columns and df[column].dropna().astype(str).str.strip().ne("").any()


def series_or_none(df: pd.DataFrame, column: str) -> pd.Series | None:
    """Return a cleaned numeric series when the column exists and has values."""
    if column not in df.columns:
        return None
    series = clean_numeric_series(df[column], return_nan=True)
    return None if not series.notna().any() else series


def weekly_day_labels(df: pd.DataFrame) -> pd.Series | None:
    """Return normalized weekday labels from trade_day or trade_date."""
    if has_non_empty(df, "trade_day"):
        return df["trade_day"].astype(str).str.strip().str.lower()
    if has_non_empty(df, "trade_date"):
        dates = pd.to_datetime(df["trade_date"], errors="coerce")
        if dates.notna().any():
            return dates.dt.day_name().str.strip().str.lower()
    return None

import numpy as np
import pandas as pd


def convert_to_datetime(
    date_series: pd.Series,
    *,
    origin: str | float = "unix",
    format: str | None = None,
    tz: str | None = None,
) -> pd.Series:
    """Convert a pandas Series of dates or timestamps into datetimes."""
    if date_series.empty:
        raise ValueError("Input Series is empty.")

    if pd.api.types.is_numeric_dtype(date_series):
        unix_result = pd.to_datetime(date_series, errors="coerce", origin=origin, unit="s")
        excel_result = pd.to_datetime(date_series, errors="coerce", origin="1899-12-30", unit="D")
        result = unix_result.where(~unix_result.isna(), excel_result)
    else:
        result = pd.to_datetime(date_series, errors="coerce", origin=origin, format=format)

    if result.isna().all():
        raise ValueError("All values in the Series could not be parsed to datetime.")

    if tz:
        if result.dt.tz is None:
            result = result.dt.tz_localize(tz)
        else:
            result = result.dt.tz_convert(tz)

    return result


def clean_numeric_series(series, return_nan=False) -> pd.Series:
    """
    General-purpose cleaner for numeric-like pandas Series.

    - Converts strings with '%' to decimal (e.g., '1.5%' → 0.015)
    - Parses numbers from strings like '0.3' or ' -2 '
    - Keeps valid int/float values
    - Invalid entries become 0.0 or np.nan (if return_nan=True)
    """
    invalid = np.nan if return_nan else 0.0

    def _convert(x):
        if pd.isna(x):
            return invalid
        if isinstance(x, str):
            x = (
                x.strip()
                .replace(",", "")
                .replace("$", "")
                .replace("€", "")
                .replace("£", "")
            )
            if x.endswith("%"):
                try:
                    return float(x.rstrip("%")) / 100
                except (ValueError, TypeError):
                    return invalid
            try:
                return float(x)
            except (ValueError, TypeError):
                return invalid
        try:
            return float(x)
        except (ValueError, TypeError):
            return invalid

    return series.apply(_convert)

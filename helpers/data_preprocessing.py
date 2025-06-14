import numpy as np
import pandas as pd


def convert_to_datetime(
    date_series: pd.Series,
    *,
    origin: str | float = "unix",
    format: str | None = None,
    tz: str | None = None,
) -> pd.Series:
    """
    Converts a pandas Series of dates/timestamps to a datetime Series.

    Args:
        date_series (pd.Series): Series with consistent date/timestamp strings or numbers.
        origin (str | float): Origin for numeric timestamps (e.g., 'unix'). Defaults to 'unix'.
        format (str, optional): Exact format for string dates (e.g., '%Y-%m-%d'). Defaults to None.
        tz (str, optional): Timezone name (e.g., 'UTC', 'US/Pacific'). If provided, converts to this timezone.
                           If None, preserves input timezone or returns naive datetimes. Defaults to None.
    Returns:
        pd.Series: Series of dtype datetime64[ns] or datetime64[ns, tz] if tz is specified.

    Raises:
        ValueError: If the input Series is empty or all values fail to parse.
    """
    if date_series.empty:
        raise ValueError("Input Series is empty.")

    result = pd.to_datetime(date_series, errors="coerce", origin=origin, format=format)

    if result.isna().all():
        raise ValueError("All values in the Series could not be parsed to datetime.")

    if tz:
        # Localize naive datetimes or convert timezone-aware datetimes to the specified timezone
        if result.dt.tz is None:
            result = result.dt.tz_localize(tz)
        else:
            result = result.dt.tz_convert(tz)

    return result

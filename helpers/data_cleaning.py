import numpy as np
import pandas as pd


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
            x = x.strip()
            if x.endswith("%"):
                try:
                    return float(x.rstrip("%")) / 100
                except:
                    return invalid
            try:
                return float(x)
            except:
                return invalid
        try:
            return float(x)
        except:
            return invalid

    return series.apply(_convert)

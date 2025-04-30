import pandas as pd


def safe_parse_mixed_dates(df, column):
    """
    Parse a DataFrame column with mixed date formats into datetime objects.

    Handles:
    - ISO format (YYYY-MM-DD)
    - U.S. format (MM/DD/YYYY)
    - European format (DD-MM-YYYY)
    - YYYY/MM/DD format
    - Mixed formats
    - Invalid entries (strings, integers, malformed dates) as NaT

    Args:
        df (pd.DataFrame): Input DataFrame
        column (str): Name of the column to parse

    Returns:
        pd.Series: Parsed datetime series, with invalid entries as NaT
    """
    # Convert to string
    original = df[column].astype(str)

    # Initialize result as NaT
    result = pd.Series(pd.NaT, index=df.index)

    # YYYY/MM/DD format: check before standardizing separators (uses /)
    yyyy_mm_dd_mask = original.str.match(r"^\d{4}/\d{2}/\d{2}$", na=False)
    result[yyyy_mm_dd_mask] = pd.to_datetime(
        original[yyyy_mm_dd_mask], format="%Y/%m/%d", errors="coerce"
    )

    # Standardize separators (/, ., etc. -> -) for remaining formats
    standardized = original.str.replace(r"[/.]", "-", regex=True)

    # ISO format: YYYY-MM-DD (4 digits, 2 digits, 2 digits)
    iso_mask = standardized.str.match(r"^\d{4}-\d{2}-\d{2}$", na=False)
    result[iso_mask] = pd.to_datetime(
        standardized[iso_mask], format="%Y-%m-%d", errors="coerce"
    )

    # U.S. format: MM-DD-YYYY (2 digits, 2 digits, 4 digits)
    us_mask = standardized.str.match(r"^\d{2}-\d{2}-\d{4}$", na=False) & ~iso_mask
    result[us_mask] = pd.to_datetime(
        standardized[us_mask], format="%m-%d-%Y", errors="coerce"
    )

    # European format: DD-MM-YYYY (2 digits, 2 digits, 4 digits)
    eu_mask = standardized.str.match(r"^\d{2}-\d{2}-\d{4}$", na=False) & ~iso_mask
    result[eu_mask] = pd.to_datetime(
        standardized[eu_mask], format="%d-%m-%Y", errors="coerce"
    )

    return result


# Example usage
if __name__ == "__main__":
    url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=212787870&single=true&output=csv"
    df = pd.read_csv(url)
    df["parsed_date"] = safe_parse_mixed_dates(df, "date")
    print(df["parsed_date"])

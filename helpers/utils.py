import datetime

import matplotlib.pyplot as plt
import pandas as pd
from matplotlib.backends.backend_pdf import PdfPages


def df_check(df: pd.DataFrame, required_columns: list[str]) -> None:
    if df is None or df.empty:
        raise ValueError("DataFrame is None or empty.")

    default_columns = [
        "date",
        "outcome",
        "pl_by_percentage",
        "risk_by_percentage",
        "entry_time",
        "exit_time",
        "pl_by_rr",
    ]
    columns_to_check = required_columns if required_columns is not None else default_columns
    missing_columns = [col for col in columns_to_check if col not in df.columns]

    if missing_columns:
        raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")


def pacman_progress(current, total):
    """Displays a Pacman-style progress bar in the console"""
    print()
    bar_length = 30
    filled = int(round(bar_length * current / float(total)))
    bar = ">" * filled + "-" * (bar_length - filled)
    print(f"\r Progress: [{bar}] {current}/{total}", end="", flush=True)


def export_figure_to_pdf(plots_list):
    pdf_path = f"{datetime.datetime.now().strftime('%Y-%m-%d')}.pdf"
    with PdfPages(pdf_path) as pdf:
        plots = plots_list
        for func, args in plots:
            fig = func(*args)
            if fig is not None:
                pdf.savefig(fig)
            plt.close()
    return pdf_path


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
    result[yyyy_mm_dd_mask] = pd.to_datetime(original[yyyy_mm_dd_mask], format="%Y/%m/%d", errors="coerce")

    # Standardize separators (/, ., etc. -> -) for remaining formats
    standardized = original.str.replace(r"[/.]", "-", regex=True)

    # ISO format: YYYY-MM-DD (4 digits, 2 digits, 2 digits)
    iso_mask = standardized.str.match(r"^\d{4}-\d{2}-\d{2}$", na=False)
    result[iso_mask] = pd.to_datetime(standardized[iso_mask], format="%Y-%m-%d", errors="coerce")

    # U.S. format: MM-DD-YYYY (2 digits, 2 digits, 4 digits)
    us_mask = standardized.str.match(r"^\d{2}-\d{2}-\d{4}$", na=False) & ~iso_mask
    result[us_mask] = pd.to_datetime(standardized[us_mask], format="%m-%d-%Y", errors="coerce")

    # European format: DD-MM-YYYY (2 digits, 2 digits, 4 digits)
    eu_mask = standardized.str.match(r"^\d{2}-\d{2}-\d{4}$", na=False) & ~iso_mask
    result[eu_mask] = pd.to_datetime(standardized[eu_mask], format="%d-%m-%Y", errors="coerce")

    return result

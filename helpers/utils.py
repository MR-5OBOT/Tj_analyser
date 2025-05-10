import datetime

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.backends.backend_pdf import PdfPages


def df_check(df: pd.DataFrame, required_columns: list[str]) -> None:
    if df is None or df.empty:
        raise ValueError("DataFrame is None or empty.")

    default_columns = [
        "date",
        "symbol",
        "entry_time",
        "exit_time",
        "outcome",
        "risk_by_percentage",
        "pl_by_rr",
        "pl_by_percentage",
    ]
    columns_to_check = default_columns if required_columns is None or len(required_columns) == 0 else required_columns
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


def strict_percentage_convert(x, return_nan=False):
    """
    Convert:
    - '1.2%' or '-1.2%' -> 0.012 or -0.012
    - 0.01 or -0.01 (if abs(x) <= 1.0) -> keep as is
    - Anything else (NaN, 'abc', 1, 1.3, etc.) -> 0.0 or np.nan
    """
    invalid = np.nan if return_nan else 0.0

    if isinstance(x, str) and x.strip().endswith("%"):
        try:
            return float(x.rstrip("%")) / 100
        except ValueError:
            return invalid

    if isinstance(x, float) and abs(x) <= 1.0:
        return x

    return invalid

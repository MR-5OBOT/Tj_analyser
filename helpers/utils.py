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


def strict_percentage_convert(x):
    """
    Convert:
    - '1.2%' -> 0.012
    - 0.012  -> 0.012 (keep)
    Anything else -> 0.0
    """
    if pd.isna(x):
        return 0.0
    if isinstance(x, str):
        x = x.strip()
        if x.endswith("%"):
            try:
                return float(x.rstrip("%")) / 100
            except ValueError:
                return 0.0
        return 0.0  # string without %
    elif isinstance(x, (float, int)):
        if 0 <= x <= 1:
            return float(x)
        return 0.0
    return 0.0

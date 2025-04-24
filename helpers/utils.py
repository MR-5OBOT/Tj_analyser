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

import datetime

import matplotlib.pyplot as plt
import pandas as pd
from matplotlib.backends.backend_pdf import PdfPages

from helpers.plots import *
from helpers.stats import *


def pacman_progress(current, total):
    """Displays a Pacman-style progress bar in the console"""
    print()
    bar_length = 30
    filled = int(round(bar_length * current / float(total)))
    bar = ">" * filled + "-" * (bar_length - filled)
    print(f"\r Progress: [{bar}] {current}/{total}", end="", flush=True)


def generate_plots(df, pl):
    return [
        (create_stats_table, (stats_table(df),)),
        (pl_curve, (df, pl)),
        (outcome_by_day, (df,)),
        (pl_distribution, (pl,)),
        (heatmap_rr, (df,)),
        # (risk_vs_reward_scatter, (df, pl(df)),
        # (boxplot_DoW, (df, pl(df))),
    ]


def export_to_pdf(df, pl):
    pdf_path = f"exported_data/trading_report_{datetime.datetime.now().strftime('%Y-%m-%d')}.pdf"
    with PdfPages(pdf_path) as pdf:
        plots = generate_plots(df, pl)
        # print(plots)  # Debug: Check what is being returned
        for func, args in plots:
            fig = func(*args)
            # print(fig)  # Debug: Check if a figure is returned
            if fig is not None:
                pdf.savefig(fig)
            plt.close()
    return pdf_path


def url() -> str:
    url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=212787870&single=true&output=csv"
    return url


def fetch_and_process() -> pd.DataFrame:
    print("Fetching data from Google Sheets...")

    df = pd.read_csv(url())
    stats = stats_table(df)
    pl = pl_series(df)

    # Store a list List of functions to execute
    steps = [
        lambda: create_stats_table(stats),
        lambda: pl_curve(df, pl),
        lambda: outcome_by_day(df),
        lambda: pl_distribution(pl),
        lambda: heatmap_rr(df),
        # lambda: risk_vs_reward_scatter(df, pl),
        # lambda: boxplot_DoW(df, pl),
        lambda: export_to_pdf(df, pl),
    ]
    # Run each function with progress tracking
    for i, step in enumerate(steps, start=1):
        pacman_progress(i, len(steps))  # Auto progress
        result = step()  # Execute function

    # Generate PDF
    pacman_progress(8, 10)
    pdf_path = export_to_pdf(df, pl)
    pacman_progress(10, 10)
    print(f"\n\nReport Successfully Generated To: {pdf_path}\n")
    return df


def df_check(df: pd.DataFrame) -> None:
    if df.empty:
        raise ValueError("Empty DataFrame")
    cols = ["date", "outcome", "pl_by_percentage", "risk_by_percentage", "entry_time", "exit_time", "pl_by_rr"]
    missing = [col for col in cols if col not in df.columns]
    if missing:
        raise ValueError(f"Missing columns: {', '.join(missing)}")


if __name__ == "__main__":
    try:
        df = fetch_and_process()
        df_check(df)
        stats = stats_table(df)
        term_stats(stats)
    except ValueError as e:
        print(f"Error: {e}")

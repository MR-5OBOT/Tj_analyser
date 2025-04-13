import datetime

import matplotlib.pyplot as plt
import pandas as pd
from matplotlib.backends.backend_pdf import PdfPages

from helpers.plots import (boxplot_DoW, create_stats_table, heatmap_rr,
                           outcome_by_day, pl_curve, pl_distribution,
                           risk_vs_reward_scatter)
from helpers.stats import calc_stats


def term_stats(df: pd.DataFrame) -> dict:
    if df is None or df.empty:
        print("No data to process.")
    stats = calc_stats(df)[2]
    for key, value in stats.items():
        print(f"{key}: {value}")
    return stats


def pacman_progress(current, total):
    """Displays a Pacman-style progress bar in the console"""
    print()
    bar_length = 30
    filled = int(round(bar_length * current / float(total)))
    bar = ">" * filled + "-" * (bar_length - filled)
    print(f"\r Progress: [{bar}] {current}/{total}", end="", flush=True)


def generate_plots(df, pl, pl_raw):
    return [
        (create_stats_table, (calc_stats(df)[2],)),  # Inline calculation
        (pl_curve, (df, pl)),
        (outcome_by_day, (df,)),
        (pl_distribution, (pl_raw,)),
        (heatmap_rr, (df,)),
        # (risk_vs_reward_scatter, (df, pl_raw)),
        # (boxplot_DoW, (df, pl_raw)),
    ]


def export_to_pdf(df, pl, pl_raw):
    pdf_path = f"./exported_data/trading_report_{datetime.datetime.now().strftime('%Y-%m-%d')}.pdf"
    with PdfPages(pdf_path) as pdf:
        for func, args in generate_plots(df, pl, pl_raw):
            pdf.savefig(func(*args))
            plt.close()
    return pdf_path


def url() -> str:
    url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=212787870&single=true&output=csv"
    return url


def fetch_and_process() -> pd.DataFrame:
    print("Fetching data from Google Sheets...")

    df = pd.read_csv(url())
    pl, pl_raw, stats = calc_stats(df)

    # Check required columns
    required_cols = ["date", "outcome", "pl_by_percentage", "risk_by_percentage", "entry_time", "exit_time", "pl_by_rr"]
    if not all(col in df.columns for col in required_cols):
        print("\nError: Missing required columns in the data")

    # Store a list List of functions to execute
    steps = [
        lambda: calc_stats(df),
        lambda: pl_curve(df, pl),
        lambda: outcome_by_day(df),
        lambda: pl_distribution(pl_raw),
        lambda: heatmap_rr(df),
        # lambda: risk_vs_reward_scatter(df, pl_raw),
        # lambda: boxplot_DoW(df, pl_raw),
        lambda: export_to_pdf(df, pl, pl_raw),
    ]
    # Run each function with progress tracking
    for i, step in enumerate(steps, start=1):
        pacman_progress(i, len(steps))  # Auto progress
        result = step()  # Execute function

    # Generate PDF
    pacman_progress(9, 10)
    pdf_path = export_to_pdf(df, pl, pl_raw)
    pacman_progress(10, 10)
    print(f"\n\nReport successfully generated: {pdf_path}")
    return df


if __name__ == "__main__":
    df = fetch_and_process()
    print()
    term_stats(df)

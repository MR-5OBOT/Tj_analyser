import datetime

import matplotlib.pyplot as plt
import pandas as pd
from matplotlib.backends.backend_pdf import PdfPages

from modules.plots import (boxplot_DoW, heatmap_rr, pl_distribution,
                           pl_curve, outcome_by_day,
                           risk_vs_reward_scatter)
from modules.statsTable import create_stats_table


def calc_stats(df):
    required_cols = ["date", "outcome", "pl_by_percentage", "risk_by_percentage", "entry_time", "pl_by_rr"]
    if not all(col in df.columns for col in required_cols):
        raise ValueError(f"Missing required columns: {', '.join(required_cols)}")

    # Overall Stats
    wins = df["outcome"].value_counts().get("WIN", 0)
    losses = df["outcome"].value_counts().get("LOSS", 0)
    winrate = (wins / (wins + losses)) * 100 if (wins + losses) > 0 else 0.0
    pl_raw = (
        df["pl_by_percentage"].str.replace("%", "").astype(float)
        if df["pl_by_percentage"].dtype == "object"
        else df["pl_by_percentage"] * 100
    )
    pl = pl_raw.cumsum()
    total_pl = pl_raw.sum()
    avg_win = pl_raw[pl_raw > 0].mean() or 0
    avg_loss = pl_raw[pl_raw < 0].mean() or 0
    risk_converted = (
        df["risk_by_percentage"].str.replace("%", "").astype(float)
        if df["risk_by_percentage"].dtype == "object"
        else df["risk_by_percentage"] * 100
    )
    avg_risk = risk_converted.mean() or 0
    avg_rr = df["pl_by_rr"].mean() or 0
    best_trade = pl_raw.max() or 0
    worst_trade = pl_raw.min() or 0
    df["peak"] = pl_raw.cummax()
    df["drawdown"] = (df["peak"] - pl_raw) / df["peak"]
    max_dd = df["drawdown"].max() or 0

    stats = {
        "Total Trades": len(df),
        "Win Rate": f"{winrate:.2f}%",
        "Total P/L": f"{total_pl:.2f}%",
        "Avg Win": f"{avg_win:.2f}%",
        "Avg Loss": f"{avg_loss:.2f}%",
        "Avg Risk": f"{avg_risk:.2f}%",
        "Avg R/R": f"{avg_rr:.2f}",
        "Best Trade": f"{best_trade:.2f}%",
        "Worst Trade": f"{worst_trade:.2f}%",
        "Max DD": f"{max_dd:.2f}%",
    }
    return pl, pl_raw, stats


# PDF Export
def export_to_pdf(df, pl, pl_raw):
    # Get current date in YYYY-MM-DD format
    current_date = datetime.datetime.now().strftime("%Y-%m-%d")
    # Create filename with date
    pdf_filename = f"trading_report_{current_date}.pdf"
    pdf_path = f"./exported_data/{pdf_filename}"

    _, _, stats = calc_stats(df)  # Get the stats dictionary

    with PdfPages(pdf_path) as pdf:
        # Add stats page first
        stats_fig = create_stats_table(stats)
        pdf.savefig(stats_fig)
        plt.close(stats_fig)

        plt.figure(figsize=(8, 6))
        pl_curve(df, pl)
        pdf.savefig()
        plt.close()

        plt.figure(figsize=(8, 6))
        outcome_by_day(df)
        pdf.savefig()
        plt.close()

        plt.figure(figsize=(8, 6))
        pl_distribution(pl_raw)
        pdf.savefig()
        plt.close()

        plt.figure(figsize=(8, 6))
        heatmap_rr(df)
        pdf.savefig()
        plt.close()

        # plt.figure(figsize=(8, 6))
        # boxplot_DoW(df, pl_raw)
        # pdf.savefig()
        # plt.close()

        # plt.figure(figsize=(8, 6))
        # risk_vs_reward_scatter(df, pl_raw)
        # pdf.savefig()
        # plt.close()
    return pdf_path


def pacman_progress(current, total):
    """Displays a Pacman-style progress bar in the console"""
    print()
    bar_length = 30
    filled = int(round(bar_length * current / float(total)))
    bar = ">" * filled + "-" * (bar_length - filled)
    print(f"\r Progress: [{bar}] {current}/{total}", end="", flush=True)


def fetch_and_process():
    url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=212787870&single=true&output=csv"
    print("Fetching data from Google Sheets...")

    df = pd.read_csv(url)
    pl, pl_raw, stats = calc_stats(df)

    # Check required columns
    required_cols = ["date", "outcome", "pl_by_percentage", "risk_by_percentage", "entry_time", "pl_by_rr"]
    if not all(col in df.columns for col in required_cols):
        print("\nError: Missing required columns in the data")
        return

    # Stor a list List of functions to execute
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


if __name__ == "__main__":
    fetch_and_process()

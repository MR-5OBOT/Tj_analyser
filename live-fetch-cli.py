import datetime

import matplotlib.pyplot as plt
import pandas as pd
from matplotlib.backends.backend_pdf import PdfPages

from modules.plots import (boxplot_DoW, heatmap_rr, outcome_by_day, pl_curve,
                           pl_distribution, risk_vs_reward_scatter)
from modules.statsTable import create_stats_table


def calc_stats(df):
    required_cols = ["date", "outcome", "pl_by_percentage", "risk_by_percentage", "entry_time", "exit_time", "pl_by_rr"]
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
    df_copy = df.copy()
    df_copy["peak"] = pl_raw.cummax()
    df_copy["drawdown"] = (df_copy["peak"] - pl_raw) / df_copy["peak"]
    max_dd = df_copy["drawdown"].max() or 0

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
        "Min Trade duration": f"{advanced_time_stats(df)[1]:.0f} Minutes",
        "Max Trade duration": f"{advanced_time_stats(df)[2]:.0f} Minutes",
    }
    return pl, pl_raw, stats


# advanced time based stats
def advanced_time_stats(df):
    df["entry_time"] = pd.to_datetime(df["entry_time"], format="%H:%M:%S")
    df["exit_time"] = pd.to_datetime(df["exit_time"], format="%H:%M:%S")

    df["duration_minutes"] = (df["exit_time"] - df["entry_time"]).dt.total_seconds() / 60

    # Filter only the rows where 'outcome' is "WIN" and 'duration_minutes' > 0
    only_wins = df[(df["duration_minutes"] > 0) & (df["outcome"] == "WIN")]["duration_minutes"]
    min_duration = only_wins.min()
    max_duration = df["duration_minutes"].max()

    # print(only_wins)

    # Get the minimum and maximum trade durations for only wins
    # print(f"Min trade duration: {min_duration:.0f} Minutes")
    # print(f"Max trade duration: {max_duration:.0f} Minutes")

    return only_wins, min_duration, max_duration


def term_stats(df):
    if df is None or df.empty:
        print("No data to process.")
        return
    stats = calc_stats(df)[2]
    for key, value in stats.items():
        print(f"{key}: {value}")


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


def fetch_and_process():
    url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=212787870&single=true&output=csv"
    print("Fetching data from Google Sheets...")

    df = pd.read_csv(url)
    pl, pl_raw, stats = calc_stats(df)

    # Check required columns
    required_cols = ["date", "outcome", "pl_by_percentage", "risk_by_percentage", "entry_time", "exit_time", "pl_by_rr"]
    if not all(col in df.columns for col in required_cols):
        print("\nError: Missing required columns in the data")
        return

    # advanced_time_stats(df)

    # # Store a list List of functions to execute
    # steps = [
    #     lambda: calc_stats(df),
    #     lambda: pl_curve(df, pl),
    #     lambda: outcome_by_day(df),
    #     lambda: pl_distribution(pl_raw),
    #     lambda: heatmap_rr(df),
    #     # lambda: risk_vs_reward_scatter(df, pl_raw),
    #     # lambda: boxplot_DoW(df, pl_raw),
    #     lambda: export_to_pdf(df, pl, pl_raw),
    # ]
    # # Run each function with progress tracking
    # for i, step in enumerate(steps, start=1):
    #     pacman_progress(i, len(steps))  # Auto progress
    #     result = step()  # Execute function
    #
    # # Generate PDF
    # pacman_progress(9, 10)
    # pdf_path = export_to_pdf(df, pl, pl_raw)
    # pacman_progress(10, 10)
    # print(f"\n\nReport successfully generated: {pdf_path}")

    return df


if __name__ == "__main__":
    df = fetch_and_process()
    print()
    term_stats(df)

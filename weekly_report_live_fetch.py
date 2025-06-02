import numpy as np
import pandas as pd

from DA_helpers.data_cleaning import *
from DA_helpers.data_preprocessing import *
from DA_helpers.formulas import *
from DA_helpers.utils import *
from DA_helpers.reports import *
from DA_helpers.visualizations import *

from personal.stats import *


def url() -> str:
    return "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=212787870&single=true&output=csv"


def pacman_progress(current, total):
    """Displays a Pacman-style progress bar in the console"""
    print()
    bar_length = 30
    filled = int(round(bar_length * current / float(total)))
    bar = ">" * filled + "-" * (bar_length - filled)
    print(f"\r Progress: [{bar}] {current}/{total}", end="", flush=True)


def generate_plots(df: pd.DataFrame, risk: pd.Series, pl: pd.Series):
    pl_title = "Distribution of Profit/Loss"
    risk_title = "Distribution of Risk"
    pl_xlabel = "P/L by (%)"
    risk_xlabel = "Risk by (%)"
    return [
        (create_stats_table, (stats_table(df),)),
        (rr_barplot, (df, pl)),
        (outcome_by_day, (df,)),
        (heatmap_rr, (df,)),
        (plot_distribution, (pl, pl_title, pl_xlabel)),
        (plot_distribution, (risk, risk_title, risk_xlabel)),
    ]


def fetch_and_process(df: pd.DataFrame, risk: pd.Series, pl: pd.Series) -> pd.DataFrame:
    print("Fetching data from Google Sheets...")

    # Use generate_plots directly for consistency
    steps = generate_plots(df, risk, pl)

    # Execute each plotting step
    for i, (func, args) in enumerate(steps, start=1):
        pacman_progress(i, len(steps))
        func(*args)

    # Generate PDF using the same steps
    pdf_path = export_pdf_report(steps)
    print(f"\n\nReport Successfully Generated To: {pdf_path}\n")
    return df


def stats_table(df: pd.DataFrame) -> dict:
    """
    Returns a dictionary of statistics.
    """
    if df is None or df.empty:
        print("Warning: No data to process for statistics.")

    # Calculate metrics using the helper functions
    total_trades = len(df) if df is not None else 0
    pl_series = clean_numeric_series(df["pl_by_percentage"])
    risk_series = clean_numeric_series(df["risk_by_percentage"])
    rr_series = clean_numeric_series(df["pl_by_rr"])
    total_pl = pl_series.sum()

    wr_no_be, wr_with_be = winrate(df)
    wins_count = winning_trades(df)
    losses_count = lossing_trades(df)
    be_count = breakevens_trades(df)
    expectancy_value = expectency(pl_series, winning_trades(df), lossing_trades(df))
    avg_w, avg_l, avg_risk, avg_rr = avg_metrics(pl_series, risk_series, rr_series)

    max_dd_value = max_drawdown_from_pct_returns(pl_series) * 100
    best_trade, worst_trade = best_worst_trade(pl_series)
    min_duration_val, max_duration_val = durations(
        df,
        start=df["entry_time"],
        end=df["exit_time"],
    )
    cons_losses = consecutive_losses(df)

    stats = {
        "Total Trades": total_trades,
        "Total P/L": f"{total_pl * 100:.2f}%",
        "Win-Rate (No BE)": f"{wr_no_be * 100:.2f}%",
        "Win-Rate (With BE)": f"{wr_with_be * 100:.2f}%",
        "Winning Trades": f"{wins_count:.0f}",
        "Lossing Trades": f"{losses_count:.0f}",
        "Breakeven Trades": f"{be_count:.0f}",
        "Consecutive Losses": f"{cons_losses}",
        "Expectancy": f"{expectancy_value * 100:.2f}%",
        "Avg Win": f"{avg_w * 100:.2f}%",
        "Avg Loss": f"{avg_l * 100:.2f}%",
        "Avg Risk": f"{avg_risk * 100:.2f}%",
        "Avg R/R": f"{avg_rr:.2f}",
        "Best Trade": f"{best_trade * 100:.2f}%",
        "Worst Trade": f"{worst_trade * 100:.2f}%",
        "Max Drawdown": f"{max_dd_value:.2f}%",
        "Min Trade duration": f"{min_duration_val:.0f} Minutes",
        "Max Trade duration": f"{max_duration_val:.0f} Minutes",
    }
    return stats


def term_stats(stats: dict) -> None:
    """
    Prints the trading statistics from a dictionary to the terminal.
    """
    if not stats:
        print("No statistics available to display.")
        return

    print("\n--- Trading Statistics ---")
    for key, value in stats.items():
        print(f"{key:<20}: {value}")  # Use f-string formatting for alignment
    return


if __name__ == "__main__":
    try:
        df = pd.read_csv(url())
        df_check(
            df,
            [
                "risk_by_percentage",
                "pl_by_percentage",
                "pl_by_rr",
                "outcome",
                "date",
                "entry_time",
                "exit_time",
                "symbol",
            ],
        )
        risk = clean_numeric_series(df["risk_by_percentage"])
        pl = clean_numeric_series(df["pl_by_percentage"])
        stats = stats_table(df)
        fetch_and_process(df, risk, pl)
        term_stats(stats)
    except Exception as e:
        print(f"Error: {e}")

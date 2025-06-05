import numpy as np
import pandas as pd
from pathlib import Path
from tqdm import tqdm

from DA_helpers.data_cleaning import *
from DA_helpers.data_preprocessing import *
from DA_helpers.formulas import *
from DA_helpers.utils import *
from DA_helpers.reports import *
from DA_helpers.visualizations import *


def url() -> str:
    return "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=212787870&single=true&output=csv"


def generate_plots(df: pd.DataFrame, risk: pd.Series, rr: pd.Series):
    rr_title = "Distribution of R/R"
    pl_xlabel = "R/R"
    rr_series = clean_numeric_series(df["R/R"])
    days = df["day"]
    entry_time = df["entry_time"]
    reward = rr_series
    risk = clean_numeric_series(df["contract"])
    outcome = df["outcome"]
    date = df["date"]
    return [
        (create_stats_table, (stats_table(df),)),
        (rr_curve, (rr_series,)),
        (outcome_by_day, (df, date, outcome)),
        (rr_barplot_months, (rr_series, df["date"])),
        (rr_barplot, (rr_series, days, None)),
        (heatmap_rr, (rr_series, days, entry_time)),
        (distribution_plot, (rr,)),
        (boxplot_DoW, (rr_series, days, outcome)),
        (risk_vs_reward_scatter, (risk, reward, outcome)),
    ]


def fetch_and_process(
    df: pd.DataFrame, risk: pd.Series, rr_series: pd.Series
) -> pd.DataFrame:
    print("Fetching data from Google Sheets...")

    # Use generate_plots directly for consistency
    steps = generate_plots(df, risk, rr_series)

    # Execute each plotting step
    for i, (func, args) in enumerate(
        tqdm(steps, desc="Progress", unit="step"), start=1
    ):
        func(*args)

    # Generate PDF using the same steps
    pdf_path = export_pdf_report(steps, type="Report")
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
    risk_series = clean_numeric_series(df["contract"])
    rr_series = clean_numeric_series(df["R/R"])
    total_rr = rr_series.sum()
    outcome = df["outcome"]

    wr_no_be, wr_with_be = winrate(pd.Series(outcome))
    wins_count = winning_trades(df)
    losses_count = losing_trades(df)
    be_count = breakeven_trades(df)
    expectancy_rr = expectancy_by_rr(rr_series, winning_trades(df), losing_trades(df))
    avg_risk, avg_rr = avg_metrics(risk_series, rr_series)

    # max_dd_value = max_drawdown_from_pct_returns(rr_series)
    best_trade, _ = best_worst_trade(rr_series)
    min_duration_val, max_duration_val = durations(
        df, df["entry_time"], df["exit_time"]
    )
    cons_losses = consecutive_losses(pd.Series(outcome), "LOSS")

    stats = {
        "Total Trades": total_trades,
        "Total R/R": f"{total_rr}",
        "Win-Rate (No BE)": f"{wr_no_be * 100:.2f}%",
        "Win-Rate (With BE)": f"{wr_with_be * 100:.2f}%",
        "Winning Trades": f"{wins_count:.0f}",
        "Lossing Trades": f"{losses_count:.0f}",
        "Breakeven Trades": f"{be_count:.0f}",
        "Consecutive Losses": f"{cons_losses}",
        "Expectancy (R/R)": f"{expectancy_rr:.2f}",
        "Avg Risk (contract)": f"{avg_risk}",
        "Avg R/R": f"{avg_rr:.2f}",
        "Best Trade (R/R)": f"{best_trade:.2f}",
        # "Worst Trade (R/R)": f"{worst_trade:.2f}",
        # "Max Drawdown": f"{max_dd_value:.2f}%",
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
    # try:
    df = pd.read_csv(url())
    df_check(
        df,
        [
            "date",
            "day",
            "symbol",
            "entry_time",
            "exit_time",
            "contract",
            "outcome",
            "R/R",
        ],
    )
    risk = clean_numeric_series(df["contract"])
    rr_series = clean_numeric_series(df["R/R"])
    stats = stats_table(df)
    fetch_and_process(df, risk, rr_series)
    term_stats(stats)
# except Exception as e:
#     print(f"Error: {e}")

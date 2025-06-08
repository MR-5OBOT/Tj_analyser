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


def get_data_url() -> str:
    """Returns the Google Sheets CSV URL."""
    return "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=1682820713&single=true&output=csv"


def generate_plots(df: pd.DataFrame) -> list[tuple]:
    """Prepare plotting steps as (function, args) tuples."""
    rr_series = clean_numeric_series(df["R/R"])
    days = df["day"]
    return [
        (create_stats_table, (stats_table(df),)),
        (rr_curve_weekly, (rr_series, days, None)),
        (rr_barplot, (rr_series, days, None)),
        # (heatmap_rr, (df,)),
    ]


def export_pdf_report(figure_list, type="Report"):
    pdf_path = f"{datetime.datetime.now().strftime('%Y-%m-%d')}-{type}.pdf"
    with PdfPages(pdf_path) as pdf:
        plots = figure_list
        for func, args in plots:
            fig = func(*args)
            if fig is not None:
                pdf.savefig(fig)
            plt.close()
    return pdf_path


def fetch_and_process(df: pd.DataFrame) -> pd.DataFrame:
    """Process data, generate plots, and export report."""
    print("Fetching and processing data...")
    steps = generate_plots(df)

    for i, (func, args) in enumerate(
        tqdm(steps, desc="Progress", unit="step"), start=1
    ):
        func(*args)

    pdf_path = export_pdf_report(steps, type="Weekly-report")
    print(f"\nReport successfully generated at: {pdf_path}\n")
    return df


def stats_table(df: pd.DataFrame) -> dict:
    """Calculate and return key trading statistics."""
    if df is None or df.empty:
        print("Warning: No data available.")
        return {}

    rr_series = clean_numeric_series(df["R/R"])
    outcomes = df["outcome"]
    total_trades = len(df)
    total_rr = rr_series.sum()
    wr_no_be, _ = winrate(outcomes, "WIN", "LOSS")
    best_trade, worst_trade = best_worst_trade(rr_series)

    return {
        "Total Trades": total_trades,
        "Total R/R": f"{total_rr}",
        "WinRate": f"{wr_no_be * 100:.2f}%",
        "Best Trade": f"{best_trade:.2f}R",
        # "Worst Trade": f"{worst_trade:.2f}R",
    }


def print_stats(stats: dict) -> None:
    """Print trading statistics nicely formatted."""
    if not stats:
        print("No stats to display.")
        return

    print("\n--- Trading Statistics ---")
    for k, v in stats.items():
        print(f"{k:<20}: {v}")


def main() -> None:
    # try:
    df = pd.read_csv(get_data_url())
    expected_cols = [
        "contract",
        "R/R",
        "outcome",
        "date",
        "day",
        "entry_time",
        "exit_time",
        "symbol",
    ]
    df_check(df, expected_cols)
    stats = stats_table(df)
    fetch_and_process(df)
    print_stats(stats)


# except Exception as e:
#     print(f"Error: {e}")


if __name__ == "__main__":
    main()

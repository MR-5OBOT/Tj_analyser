import datetime

import matplotlib.pyplot as plt
import pandas as pd
from matplotlib.backends.backend_pdf import PdfPages

from helpers.utils import *
from helpers.plots import *
from helpers.stats import *


def url() -> str:
    url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=212787870&single=true&output=csv"
    return url

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
        lambda: export_figure_to_pdf(generate_plots(df, pl)),
    ]
    # Run each function with progress tracking
    for i, step in enumerate(steps, start=1):
        pacman_progress(i, len(steps))  # Auto progress
        result = step()  # Execute function

    # Generate PDF
    # pacman_progress(8, 10)
    pdf_path = export_figure_to_pdf(generate_plots(df, pl))
    # pacman_progress(10, 10)
    print(f"\n\nReport Successfully Generated To: {pdf_path}\n")
    return df


if __name__ == "__main__":
    try:
        df = fetch_and_process()
        df_check(df)
        stats = stats_table(df)
        term_stats(stats)
    except ValueError as e:
        print(f"Error: {e}")

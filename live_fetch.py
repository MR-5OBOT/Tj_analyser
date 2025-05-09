import pandas as pd

from helpers.plots import (
    create_stats_table,
    heatmap_rr,
    outcome_by_day,
    pl_curve,
    pl_distribution,
)
from helpers.stats import pl_raw, risk_raw, stats_table, term_stats
from helpers.utils import df_check, export_figure_to_pdf, pacman_progress


def url() -> str:
    url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=212787870&single=true&output=csv"
    return url


def generate_plots(df: pd.DataFrame, risk: pd.Series, pl: pd.Series):
    return [
        (create_stats_table, (stats_table(df),)),
        (pl_curve, (df, pl)),
        (outcome_by_day, (df,)),
        (heatmap_rr, (df,)),
        (pl_distribution, (pl,)),
        # (risk_vs_reward_scatter, (df, risk, pl)),
        # (boxplot_DoW, (df, pl)),
    ]


def fetch_and_process(df, risk, pl, stats) -> pd.DataFrame:
    """start the process"""
    print("Fetching data from Google Sheets...")

    # Store a list List of functions to execute
    steps = [
        lambda: create_stats_table(stats),
        lambda: pl_curve(df, pl),
        lambda: outcome_by_day(df),
        lambda: heatmap_rr(df),
        lambda: pl_distribution(pl),
        # lambda: risk_vs_reward_scatter(df, risk, pl),
        # lambda: boxplot_DoW(df, pl),
        lambda: export_figure_to_pdf(generate_plots(df, risk, pl)),
    ]
    # Run each function with progress tracking
    for i, step in enumerate(steps, start=1):
        pacman_progress(i, len(steps))  # Auto progress
        step()  # Execute function

    # Generate PDF
    # pacman_progress(8, 10)
    pdf_path = export_figure_to_pdf(generate_plots(df, risk, pl))
    # pacman_progress(10, 10)
    print(f"\n\nReport Successfully Generated To: {pdf_path}\n")
    return df


if __name__ == "__main__":
    try:
        df = pd.read_csv(url())
        risk = risk_raw(df)
        pl = pl_raw(df)
        stats = stats_table(df)
        fetch_and_process(df, risk, pl, stats)
        df_check(df, [])
        term_stats(stats)
    except ValueError as e:
        print(f"Error: {e}")

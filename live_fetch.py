import pandas as pd
from helpers.plots import *
from helpers.stats import *
from helpers.utils import *


def url() -> str:
    return "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=212787870&single=true&output=csv"


def generate_plots(df: pd.DataFrame, risk: pd.Series, pl: pd.Series):
    pl_title = "Distribution of Profit/Loss"
    risk_title = "Distribution of Risk"
    pl_xlabel = "P/L by (%)"
    risk_xlabel = "Risk by (%)"
    return [
        (create_stats_table, (stats_table(df),)),
        (pl_curve, (df, pl)),
        (outcome_by_day, (df,)),
        (heatmap_rr, (df,)),
        (plot_distribution, (pl, pl_title, pl_xlabel)),
        (plot_distribution, (risk, risk_title, risk_xlabel)),
        (boxplot_DoW, (df, pl)),
        (risk_vs_reward_scatter, (df, risk, pl)),
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
    pdf_path = export_figure_to_pdf(steps)
    print(f"\n\nReport Successfully Generated To: {pdf_path}\n")
    return df


if __name__ == "__main__":
    try:
        df = pd.read_csv(url())
        risk = risk_raw(df)
        pl = pl_raw(df)
        stats = stats_table(df)
        fetch_and_process(df, risk, pl)
        df_check(df, [])
        term_stats(stats)
        print(df["date"])
    except ValueError as e:
        print(f"Error: {e}")

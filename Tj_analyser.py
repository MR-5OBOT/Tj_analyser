import argparse
import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from matplotlib.backends.backend_pdf import PdfPages
import matplotlib.pyplot as plt
from tqdm import tqdm

from DA_helpers.data_cleaning import *
from DA_helpers.data_preprocessing import *
from DA_helpers.formulas import *
from DA_helpers.utils import *
from DA_helpers.visualizations import *
# from DA_helpers.reports import *


def get_data_url_weekly() -> str:
    return "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=1682820713&single=true&output=csv"


def get_data_url_overall() -> str:
    return "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=212787870&single=true&output=csv"


def generate_plots_weekly(df: pd.DataFrame) -> list[tuple]:
    rr_series = clean_numeric_series(df["R/R"])
    days = df["day"]
    return [
        (create_stats_table, (stats_table_weekly(df),)),
        (rr_curve_weekly, (rr_series, days, None)),
        (rr_barplot, (rr_series, days, None)),
    ]


def generate_plots_overall(df: pd.DataFrame):
    rr_title = "Distribution of R/R"
    pl_xlabel = "R/R"
    rr_series = clean_numeric_series(df["R/R"])
    risk = clean_numeric_series(df["contract"])
    days = df["day"]
    entry_time = df["entry_time"]
    reward = rr_series
    outcome = df["outcome"]
    date = df["date"]

    return [
        (create_stats_table, (stats_table_overall(df),)),
        (rr_curve, (rr_series,)),
        (outcome_by_day, (outcome, None, days, "WIN", "LOSS", "BE")),
        (rr_barplot_months, (rr_series, date)),
        (rr_barplot, (rr_series, days, None)),
        (heatmap_rr, (rr_series, days, entry_time)),
        (distribution_plot, (rr_series, rr_title)),
        (boxplot_DoW, (rr_series, days, outcome)),
        (risk_vs_reward_scatter, (risk, reward, outcome)),
    ]


def export_pdf_report(figure_list, report_type="Report"):
    pdf_path = f"{datetime.datetime.now().strftime('%Y-%m-%d')}-{report_type}.pdf"
    with PdfPages(pdf_path) as pdf:
        for func, args in figure_list:
            fig = func(*args)
            if fig is not None:
                pdf.savefig(fig)
            plt.close()
    return pdf_path


def fetch_and_process(df: pd.DataFrame, report_type: str) -> pd.DataFrame:
    print("Processing and generating report...")

    if report_type == "weekly":
        steps = generate_plots_weekly(df)
    elif report_type == "overall":
        steps = generate_plots_overall(df)
    else:
        raise ValueError(f"Unknown report type: {report_type}")

    for func, args in tqdm(steps, desc="Generating plots", unit="step"):
        func(*args)

    pdf_path = export_pdf_report(steps, report_type=report_type.capitalize())
    print(f"\n Report successfully saved to: {pdf_path}")
    return df


def stats_table_weekly(df: pd.DataFrame) -> dict:
    rr_series = clean_numeric_series(df["R/R"])
    outcomes = df["outcome"]
    total_trades = len(df)
    total_rr = rr_series.sum()
    wr_no_be, _ = winrate(outcomes, "WIN", "LOSS")
    best_trade, worst_trade = best_worst_trade(rr_series)

    return {
        "Total Trades": total_trades,
        "Total R/R": f"{total_rr:.2f}",
        "WinRate": f"{wr_no_be * 100:.2f}%",
        "Best Trade": f"{best_trade:.2f}R",
    }


def stats_table_overall(df: pd.DataFrame) -> dict:
    total_trades = len(df)
    risk_series = clean_numeric_series(df["contract"])
    rr_series = clean_numeric_series(df["R/R"])
    total_rr = rr_series.sum()
    outcome = df["outcome"]

    wr_no_be, wr_with_be = winrate(pd.Series(outcome))
    wins_count = winning_trades(df)
    losses_count = losing_trades(df)
    be_count = breakeven_trades(df)
    expectancy_rr = expectancy_by_rr(rr_series, wins_count, losses_count)
    avg_risk, avg_rr = avg_metrics(risk_series, rr_series)
    best_trade, _ = best_worst_trade(rr_series)
    min_duration_val, max_duration_val = durations(
        df, df["entry_time"], df["exit_time"]
    )
    cons_losses = consecutive_losses(outcome, "LOSS")

    return {
        "Total Trades": total_trades,
        "Total R/R": f"{total_rr:.2f}",
        "Win-Rate (No BE)": f"{wr_no_be * 100:.2f}%",
        "Win-Rate (With BE)": f"{wr_with_be * 100:.2f}%",
        "Winning Trades": f"{wins_count}",
        "Lossing Trades": f"{losses_count}",
        "Breakeven Trades": f"{be_count}",
        "Consecutive Losses": f"{cons_losses}",
        "Expectancy (R/R)": f"{expectancy_rr:.2f}",
        "Avg Risk (contract)": f"{avg_risk}",
        "Avg R/R": f"{avg_rr:.2f}",
        "Best Trade (R/R)": f"{best_trade:.2f}",
        "Min Trade duration": f"{min_duration_val:.0f} Minutes",
        "Max Trade duration": f"{max_duration_val:.0f} Minutes",
    }


def term_stats(stats: dict) -> None:
    print("\n --- Trading Statistics ---")
    for key, value in stats.items():
        print(f"{key:<25}: {value}")


def main():
    parser = argparse.ArgumentParser(description="Generate trading report.")
    parser.add_argument(
        "--type",
        type=str,
        choices=["weekly", "overall"],
        # default="overall",
        required=True,
        help="Choose the type of report to generate",
    )
    args = parser.parse_args()
    report_type = args.type

    # Choose URL and stats method based on type
    url = get_data_url_weekly() if report_type == "weekly" else get_data_url_overall()
    stats_func = stats_table_weekly if report_type == "weekly" else stats_table_overall

    df = pd.read_csv(url)
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
    stats = stats_func(df)
    fetch_and_process(df, report_type)
    term_stats(stats)


if __name__ == "__main__":
    main()

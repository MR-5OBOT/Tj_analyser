"""Modern refactored main script with clean imports and structure."""

import argparse
from pathlib import Path
from datetime import datetime

import pandas as pd
from matplotlib.backends.backend_pdf import PdfPages
import matplotlib.pyplot as plt
from tqdm import tqdm

# Explicit imports instead of wildcards
from helpers.data_cleaning import clean_numeric_series
from helpers.utils import df_check
from helpers.calculations import (
    winrate,
    winning_trades,
    losing_trades,
    breakeven_trades,
    profit_factor,
    avg_metrics,
    best_worst_trade,
    expectancy_from_rr,
    consecutive_wins_and_losses,
)
from helpers.visualizations import (
    create_stats_table,
    rr_curve,
    rr_curve_weekly,
    rr_barplot,
    rr_barplot_months,
    outcome_by_day,
    heatmap_rr,
    bar_outcomes_by_custom_ranges,
    rr_vs_hour_range_bubble_scatter,
    distribution_plot,
    risk_vs_reward_scatter,
    rr_vs_sl_points,
)
from config import DATA_URL_WEEKLY, DATA_URL_OVERALL, REQUIRED_COLUMNS


def generate_plots_weekly(df: pd.DataFrame) -> list[tuple]:
    """Generate plot functions and arguments for weekly reports."""
    rr_series = clean_numeric_series(df["R/R"])
    days = df["day"]
    
    return [
        (create_stats_table, (stats_table_weekly(df),)),
        (rr_curve_weekly, (rr_series, days, None)),
        (rr_barplot, (rr_series, days, None)),
    ]


def generate_plots_overall(df: pd.DataFrame) -> list[tuple]:
    """Generate plot functions and arguments for overall reports."""
    rr_series = clean_numeric_series(df["R/R"])
    sl_points = clean_numeric_series(df["sl_points"])
    risk = clean_numeric_series(df["contracts"])
    days = df["day"]
    entry_time = df["entry_time"]
    outcome = df["outcome"]
    date = df["date"]
    
    time_ranges = [
        ("09:30–10:00", "09:30", "10:00"),
        ("10:00–11:00", "10:00", "11:00"),
    ]

    return [
        (create_stats_table, (stats_table_overall(df),)),
        (rr_curve, (rr_series,)),
        (outcome_by_day, (outcome, None, days, "WIN", "LOSS", "BE")),
        (heatmap_rr, (rr_series, days, entry_time)),
        (bar_outcomes_by_custom_ranges, (outcome, entry_time, time_ranges)),
        (rr_vs_hour_range_bubble_scatter, (entry_time, rr_series, outcome)),
        (distribution_plot, (df["sl_points"], "Distribution of Stop-Loss points")),
        (risk_vs_reward_scatter, (risk, rr_series, outcome)),
        (rr_vs_sl_points, (sl_points, rr_series, outcome)),
        (rr_barplot_months, (rr_series, date)),
    ]


def stats_table_weekly(df: pd.DataFrame) -> dict:
    """Calculate statistics for weekly report."""
    rr_series = clean_numeric_series(df["R/R"])
    outcome = df["outcome"].str.strip()
    total_trades = len(df)
    total_rr = rr_series.sum()
    best_trade, _ = best_worst_trade(rr_series)

    return {
        "Total Trades": total_trades,
        "Total R/R": f"{total_rr:.2f}",
        "Best Trade": f"{best_trade:.2f}R",
    }


def stats_table_overall(df: pd.DataFrame) -> dict:
    """Calculate statistics for overall report."""
    total_trades = len(df)
    risk_series = clean_numeric_series(df["contracts"])
    rr_series = clean_numeric_series(df["R/R"])
    total_rr = rr_series.sum()
    outcomes = df["outcome"].str.strip()
    
    profit_factor_value = profit_factor(rr_series)
    wr_no_be, _ = winrate(outcomes)
    wins_count = winning_trades(df)
    losses_count = losing_trades(df)
    be_count = breakeven_trades(df)
    expectancy_rr = expectancy_from_rr(outcomes, rr_series)
    avg_risk, avg_rr = avg_metrics(risk_series, rr_series)
    best_trade, _ = best_worst_trade(rr_series)
    cons_losses, cons_wins = consecutive_wins_and_losses(outcomes, "LOSS", "WIN")

    return {
        "Total Trades": total_trades,
        "Total R/R": f"{total_rr:.2f}",
        "WinRate": f"{wr_no_be * 100:.2f}%",
        "Winning Trades": f"{wins_count}",
        "Losing Trades": f"{losses_count}",
        "Breakeven Trades": f"{be_count}",
        "Consecutive Losses": f"{cons_losses}",
        "Consecutive Wins": f"{cons_wins}",
        "Avg R/R": f"{avg_rr:.2f}",
        "Avg Risk (contracts)": f"{avg_risk:.0f}",
        "Profit Factor": f"{profit_factor_value:.2f}",
        "Expectancy": f"{expectancy_rr:.2f}",
        "Best Trade": f"{best_trade:.2f}R",
    }


def term_stats(stats: dict) -> None:
    """Print statistics to terminal in formatted way."""
    print("\n--- Trading Statistics ---")
    for key, value in stats.items():
        print(f"{key:<25}: {value}")


def export_pdf_report(figure_list: list[tuple], report_type: str = "Report") -> str:
    """Export all figures to a PDF file."""
    pdf_path = f"{datetime.now().strftime('%Y-%m-%d')}-{report_type}.pdf"
    
    with PdfPages(pdf_path) as pdf:
        for func, args in figure_list:
            fig = func(*args)
            if fig is not None:
                pdf.savefig(fig)
            plt.close()
    
    return pdf_path


def fetch_and_process(df: pd.DataFrame, report_type: str) -> pd.DataFrame:
    """Process data and generate report."""
    print("Processing and generating report...")

    plot_funcs = {
        "weekly": generate_plots_weekly,
        "overall": generate_plots_overall,
    }
    
    if report_type not in plot_funcs:
        raise ValueError(f"Unknown report type: {report_type}")

    steps = plot_funcs[report_type](df)

    for func, args in tqdm(steps, desc="Generating plots", unit="step"):
        func(*args)

    pdf_path = export_pdf_report(steps, report_type=report_type.capitalize())
    print(f"\nReport successfully saved to: {pdf_path}")
    
    return df


def main() -> None:
    """Main entry point for the application."""
    parser = argparse.ArgumentParser(
        description="Generate trading performance reports from Google Sheets data."
    )
    parser.add_argument(
        "--type",
        type=str,
        choices=["weekly", "overall"],
        required=True,
        help="Type of report to generate (weekly or overall)",
    )
    args = parser.parse_args()
    report_type = args.type

    # URL mapping
    url_map = {
        "weekly": DATA_URL_WEEKLY,
        "overall": DATA_URL_OVERALL,
    }
    
    # Stats function mapping
    stats_funcs = {
        "weekly": stats_table_weekly,
        "overall": stats_table_overall,
    }

    url = url_map[report_type]
    stats_func = stats_funcs[report_type]

    # Fetch and validate data
    df = pd.read_csv(url)
    df_check(df, REQUIRED_COLUMNS)

    # Generate report
    fetch_and_process(df, report_type)
    
    # Display stats in terminal
    stats = stats_func(df)
    term_stats(stats)


if __name__ == "__main__":
    main()

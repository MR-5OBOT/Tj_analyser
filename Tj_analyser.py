import argparse
from datetime import datetime

import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
from tqdm import tqdm

from config import DATA_URL_OVERALL, DATA_URL_WEEKLY
from helpers.calculations import (
    stats_table_overall,
    stats_table_weekly,
)
from helpers.journal_normalization import (
    load_journal_config,
    load_journal_data,
    normalize_journal,
    print_detected_mappings,
)
from helpers.utils import has_non_empty, series_or_none
from helpers.visualizations import (
    asset_performance_bar,
    bar_outcomes_by_custom_ranges,
    create_stats_table,
    distribution_plot,
    drawdown_curve,
    heatmap_rr,
    outcome_by_day,
    risk_vs_reward_scatter,
    rr_barplot,
    rr_barplot_months,
    rr_curve,
    rr_vs_hour_range_bubble_scatter,
    rr_vs_sl_points,
)


def has_columns(df: pd.DataFrame, *columns: str) -> bool:
    return all(column in df.columns for column in columns)


def add_plot(plots: list[tuple], enabled: bool, func, *args) -> None:
    """Append a plot only when its data requirements are satisfied."""
    if enabled:
        plots.append((func, args))


def generate_plots_weekly(df: pd.DataFrame) -> list[tuple]:
    """Generate plot functions and arguments for weekly reports."""
    plots: list[tuple] = [(create_stats_table, (stats_table_weekly(df),))]

    rr_series = series_or_none(df, "rr")
    days = df["trade_day"] if "trade_day" in df.columns else None
    dates = df["trade_date"] if "trade_date" in df.columns else None
    add_plot(
        plots,
        rr_series is not None and (has_non_empty(df, "trade_day") or has_non_empty(df, "trade_date")),
        rr_barplot,
        rr_series,
        days,
        dates,
        "Weekly R by Day",
        "",
        "Total R",
    )

    return plots


def generate_plots_overall(df: pd.DataFrame) -> list[tuple]:
    """Generate plot functions and arguments for overall reports."""
    plots: list[tuple] = [(create_stats_table, (stats_table_overall(df),))]
    time_ranges = [
        ("09:30–10:00", "09:30", "10:00"),
        ("10:00–11:00", "10:00", "11:00"),
    ]

    rr_series = series_or_none(df, "rr")
    stop_loss_points = series_or_none(df, "stop_loss_points")
    position_size = series_or_none(df, "position_size")

    date_series = df["trade_date"] if "trade_date" in df.columns else None
    day_series = df["trade_day"] if "trade_day" in df.columns else None

    add_plot(plots, rr_series is not None and not rr_series.empty, rr_curve, rr_series)
    add_plot(plots, rr_series is not None and not rr_series.empty, drawdown_curve, rr_series)
    add_plot(plots, rr_series is not None and has_non_empty(df, "asset"), asset_performance_bar, df["asset"], rr_series)
    add_plot(
        plots,
        has_non_empty(df, "outcome") and (has_non_empty(df, "trade_day") or has_non_empty(df, "trade_date")),
        outcome_by_day,
        df["outcome"],
        date_series,
        day_series,
        "WIN",
        "LOSS",
        "BE",
    )
    add_plot(plots, rr_series is not None and has_columns(df, "trade_day", "entry_time"), heatmap_rr, rr_series, df["trade_day"], df["entry_time"])
    add_plot(plots, has_columns(df, "outcome", "entry_time"), bar_outcomes_by_custom_ranges, df["outcome"], df["entry_time"], time_ranges)
    add_plot(plots, rr_series is not None and has_columns(df, "entry_time", "outcome"), rr_vs_hour_range_bubble_scatter, df["entry_time"], rr_series, df["outcome"])
    add_plot(plots, stop_loss_points is not None and not stop_loss_points.empty, distribution_plot, stop_loss_points, "Distribution of Stop-Loss points", "Stop-Loss Points")
    add_plot(
        plots,
        position_size is not None and rr_series is not None and has_non_empty(df, "outcome"),
        risk_vs_reward_scatter,
        position_size,
        rr_series,
        df["outcome"],
        "Position Size vs R/R",
        "Position Size",
        "R/R",
    )
    add_plot(plots, stop_loss_points is not None and rr_series is not None and has_non_empty(df, "outcome"), rr_vs_sl_points, stop_loss_points, rr_series, df["outcome"])
    add_plot(plots, rr_series is not None and has_non_empty(df, "trade_date"), rr_barplot_months, rr_series, df["trade_date"])

    return plots

def term_stats(stats: dict) -> None:
    """Print statistics to terminal in formatted way."""
    print("\n--- Trading Statistics ---")
    for key, value in stats.items():
        print(f"{key:<25}: {value}")


def export_pdf_report(figure_list: list[tuple], report_type: str = "Report") -> str:
    """Export all figures to a PDF file."""
    pdf_path = f"{datetime.now().strftime('%Y-%m-%d')}-{report_type}.pdf"

    with PdfPages(pdf_path) as pdf:
        for func, args in tqdm(figure_list, desc="Generating plots", unit="plot"):
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
    stats_funcs = {
        "weekly": stats_table_weekly,
        "overall": stats_table_overall,
    }

    if report_type not in plot_funcs:
        raise ValueError(f"Unknown report type: {report_type}")

    steps = plot_funcs[report_type](df)
    pdf_path = export_pdf_report(steps, report_type=report_type.capitalize())
    print(f"\nReport successfully saved to: {pdf_path}")

    stats = stats_funcs[report_type](df)
    term_stats(stats)
    return df


def load_input_dataframe(report_type: str, input_path: str | None, config_path: str | None) -> pd.DataFrame:
    """Load data from a local journal or fallback URL, then normalize it."""
    journal_config = load_journal_config(config_path)

    if input_path or journal_config.get("source", {}).get("path"):
        raw_df = load_journal_data(input_path, journal_config)
    else:
        url_map = {
            "weekly": DATA_URL_WEEKLY,
            "overall": DATA_URL_OVERALL,
        }
        raw_df = pd.read_csv(url_map[report_type])

    return normalize_journal(raw_df, journal_config)

def main() -> None:
    """Main entry point for the application."""
    parser = argparse.ArgumentParser(
        description="Generate trading performance reports from CSV or Excel journals."
    )
    parser.add_argument(
        "--type",
        type=str,
        choices=["weekly", "overall"],
        required=True,
        help="Type of report to generate (weekly or overall)",
    )
    parser.add_argument(
        "--input",
        type=str,
        default=None,
        help="Path to a CSV or Excel journal file",
    )
    parser.add_argument(
        "--config",
        type=str,
        default=None,
        help="Path to a journal mapping config TOML file",
    )
    args = parser.parse_args()

    df = load_input_dataframe(args.type, args.input, args.config)
    print_detected_mappings(df)
    fetch_and_process(df, args.type)


if __name__ == "__main__":
    main()

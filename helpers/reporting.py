from datetime import datetime
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
from matplotlib.backends.backend_pdf import PdfPages
from tqdm import tqdm

from helpers.calculations import stats_table_overall
from helpers.utils import column_or_none, has_non_empty, series_or_none
from helpers.visualizations import (
    asset_performance_bar,
    bar_outcomes_by_custom_ranges,
    create_stats_table,
    distribution_plot,
    drawdown_curve,
    heatmap_rr,
    outcome_by_day,
    risk_vs_reward_scatter,
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
    date_series = column_or_none(df, "trade_date")
    day_series = column_or_none(df, "trade_day")
    outcome_series = column_or_none(df, "outcome")
    entry_series = column_or_none(df, "entry_time")
    asset_series = column_or_none(df, "asset")

    add_plot(plots, rr_series is not None and not rr_series.empty, rr_curve, rr_series)
    add_plot(plots, rr_series is not None and not rr_series.empty, drawdown_curve, rr_series)
    add_plot(plots, rr_series is not None and has_non_empty(df, "asset"), asset_performance_bar, asset_series, rr_series)
    add_plot(
        plots,
        has_non_empty(df, "outcome") and (has_non_empty(df, "trade_day") or has_non_empty(df, "trade_date")),
        outcome_by_day,
        outcome_series,
        date_series,
        day_series,
        "WIN",
        "LOSS",
        "BE",
    )
    add_plot(plots, rr_series is not None and has_columns(df, "trade_day", "entry_time"), heatmap_rr, rr_series, day_series, entry_series)
    add_plot(plots, has_columns(df, "outcome", "entry_time"), bar_outcomes_by_custom_ranges, outcome_series, entry_series, time_ranges)
    add_plot(plots, rr_series is not None and has_columns(df, "entry_time", "outcome"), rr_vs_hour_range_bubble_scatter, entry_series, rr_series, outcome_series)
    add_plot(plots, stop_loss_points is not None and not stop_loss_points.empty, distribution_plot, stop_loss_points, "Distribution of Stop-Loss points", "Stop-Loss Points")
    add_plot(
        plots,
        position_size is not None and rr_series is not None and has_non_empty(df, "outcome"),
        risk_vs_reward_scatter,
        position_size,
        rr_series,
        outcome_series,
        "Position Size vs R/R",
        "Position Size",
        "R/R",
    )
    add_plot(plots, stop_loss_points is not None and rr_series is not None and has_non_empty(df, "outcome"), rr_vs_sl_points, stop_loss_points, rr_series, outcome_series)
    add_plot(plots, rr_series is not None and has_non_empty(df, "trade_date"), rr_barplot_months, rr_series, date_series)

    return plots


def export_pdf_report(
    figure_list: list[tuple],
    report_type: str = "Report",
    output_path: str | Path | None = None,
) -> str:
    """Export all figures to a PDF file."""
    pdf_path = str(output_path) if output_path else f"{datetime.now().strftime('%Y-%m-%d')}-{report_type}.pdf"

    with PdfPages(pdf_path) as pdf:
        for func, args in tqdm(figure_list, desc="Generating plots", unit="plot"):
            fig = func(*args)
            if fig is not None:
                pdf.savefig(fig)
            plt.close()

    return pdf_path


def build_report(df: pd.DataFrame) -> tuple[list[tuple], dict]:
    """Build the overall report: its plots and summary stats."""
    return generate_plots_overall(df), stats_table_overall(df)



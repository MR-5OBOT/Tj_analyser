from datetime import datetime
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
from matplotlib.backends.backend_pdf import PdfPages
from tqdm import tqdm

from helpers.calculations import stats_table_overall, stats_table_weekly
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


def build_report(df: pd.DataFrame, report_type: str) -> tuple[list[tuple], dict]:
    """Build plots and stats for a report type."""
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

    report_df = _prepare_report_dataframe(df, report_type)
    return plot_funcs[report_type](report_df), stats_funcs[report_type](report_df)


def _prepare_report_dataframe(df: pd.DataFrame, report_type: str) -> pd.DataFrame:
    if report_type != "weekly":
        return df
    return _latest_week_slice(df)


def _latest_week_slice(df: pd.DataFrame) -> pd.DataFrame:
    """Restrict weekly reports to the latest calendar week found in trade_date."""
    if "trade_date" not in df.columns:
        return df

    trade_dates = pd.to_datetime(df["trade_date"], errors="coerce")
    valid_mask = trade_dates.notna()
    if not valid_mask.any():
        return df

    iso_calendar = trade_dates[valid_mask].dt.isocalendar()
    latest_year = int(iso_calendar["year"].iloc[-1])
    latest_week = int(iso_calendar["week"].iloc[-1])

    latest_mask = valid_mask.copy()
    latest_mask.loc[valid_mask] = (
        (iso_calendar["year"] == latest_year) & (iso_calendar["week"] == latest_week)
    ).to_numpy()

    weekly_df = df.loc[latest_mask].copy()
    return weekly_df if not weekly_df.empty else df

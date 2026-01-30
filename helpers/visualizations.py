"""Modern visualization functions with reduced code duplication."""

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from matplotlib.figure import Figure

from config import COLORS, PLOT_DEFAULTS, DAY_ORDER
from helpers.plot_styling import create_figure, style_axes, finalize_plot


def rr_curve(
    rr_series: pd.Series,
    title: str = "Performance by (R/R)",
    xlabel: str = "Trades",
    ylabel: str = "Sum",
    figsize: tuple = PLOT_DEFAULTS["figsize"],
) -> Figure:
    """Plot cumulative R/R performance."""
    fig, ax = create_figure(figsize)
    
    x = range(len(rr_series))
    sns.lineplot(x=x, y=rr_series.cumsum(), label="R/R", color=COLORS["primary"], ax=ax)
    
    style_axes(ax, title, xlabel, ylabel)
    ax.legend()
    
    return finalize_plot(fig)


def rr_curve_weekly(
    rr_series: pd.Series,
    days: pd.Series | None = None,
    dates: pd.Series | None = None,
    title: str = "Performance by R/R",
    xlabel: str = "",
    ylabel: str = "",
    figsize: tuple = PLOT_DEFAULTS["figsize"],
) -> Figure:
    """Plot cumulative R/R by day of the week."""
    fig, ax = create_figure(figsize)

    # Determine x values
    if days is not None:
        x_vals = days.str.strip().str.lower()
    elif dates is not None:
        x_vals = pd.to_datetime(dates, errors="coerce").dt.day_name().str.strip().str.lower()
    else:
        raise ValueError("No date or day series was provided!")

    # Group and order by day
    grouped_rr = rr_series.groupby(x_vals).sum()
    ordered_rr = grouped_rr.reindex(DAY_ORDER).dropna()
    cum_series = ordered_rr.cumsum()
    
    # Plot
    sns.lineplot(
        x=cum_series.index,
        y=cum_series.values,
        label="Cumulative R/R",
        color=COLORS["primary"],
        marker="o",
        linewidth=PLOT_DEFAULTS["linewidth"],
        markersize=PLOT_DEFAULTS["markersize"],
        ax=ax,
    )
    
    style_axes(ax, title, xlabel, ylabel)
    ax.legend()
    
    return finalize_plot(fig)


def rr_barplot(
    rr_series: pd.Series,
    days: pd.Series | None = None,
    dates: pd.Series | None = None,
    title: str = "R/R By Each Day",
    xlabel: str = "",
    ylabel: str = "",
    figsize: tuple = PLOT_DEFAULTS["figsize"],
) -> Figure:
    """Create bar plot of total R/R by day."""
    fig, ax = create_figure(figsize)

    # Get day labels
    if days is not None:
        day_labels = days.str.strip().str.lower()
    elif dates is not None:
        day_labels = pd.to_datetime(dates, errors="coerce").dt.day_name().str.strip().str.lower()
    else:
        raise ValueError("No date or day series was provided!")

    # Group and order
    grouped_rr = rr_series.groupby(day_labels).sum()
    ordered_rr = grouped_rr.reindex(DAY_ORDER).dropna()

    sns.barplot(
        x=ordered_rr.index,
        y=ordered_rr.values,
        label="R/R",
        errorbar=None,
        color=COLORS["secondary"],
        ax=ax,
    )
    
    ax.axhline(0, color=COLORS["gray"], linestyle="-", linewidth=1)
    style_axes(ax, title, xlabel, ylabel)
    ax.legend()
    
    return finalize_plot(fig)


def rr_barplot_months(
    rr_series: pd.Series,
    dates: pd.Series,
    title: str = "R/R By Each Month",
    xlabel: str = "",
    ylabel: str = "Total R/R",
    figsize: tuple = PLOT_DEFAULTS["figsize"],
) -> Figure:
    """Create bar plot of R/R by month."""
    # Validation
    if rr_series.empty or dates.empty:
        raise ValueError("Input series cannot be empty")
    if len(rr_series) != len(dates):
        raise ValueError("rr_series and dates must have the same length")

    # Convert dates
    dates = pd.to_datetime(dates, errors="coerce")
    if dates.isna().all():
        raise ValueError("No valid dates provided")

    # Create and process DataFrame
    df = pd.DataFrame({"dates": dates, "rr": rr_series})
    df["month_num"] = df["dates"].dt.month
    df["year"] = df["dates"].dt.year
    df["month_name"] = df["dates"].dt.strftime("%b %Y")

    monthly_rr = df.groupby(["year", "month_num", "month_name"])["rr"].sum().reset_index()
    monthly_rr = monthly_rr.sort_values(["year", "month_num"])

    # Dynamic figure size
    num_months = len(monthly_rr)
    dynamic_figsize = (max(8, num_months * 0.75), 6)
    
    fig, ax = create_figure(dynamic_figsize)
    
    sns.barplot(
        x="month_name",
        y="rr",
        data=monthly_rr,
        label="R/R",
        color=COLORS["secondary"],
        errorbar=None,
        ax=ax,
    )
    
    ax.axhline(0, color=COLORS["gray"], linestyle="-", linewidth=1)
    style_axes(ax, title, xlabel, ylabel, rotation=45)
    ax.legend()
    
    return finalize_plot(fig)


def outcome_by_day(
    outcome_series: pd.Series,
    date_series: pd.Series = None,
    day_series: pd.Series = None,
    win: str = "WIN",
    loss: str = "LOSS",
    be: str = "BE",
    title: str = "Outcome by Day",
    xlabel: str = "",
    ylabel: str = "",
    figsize: tuple = PLOT_DEFAULTS["figsize"],
) -> Figure:
    """Create bar plot of outcome counts by day."""
    if date_series is None and day_series is None:
        raise ValueError("Provide either date_series or day_series.")
    
    fig, ax = create_figure(figsize)

    if date_series is not None:
        days = pd.to_datetime(date_series, errors="coerce").dt.day_name().str.strip().str.lower()
    else:
        days = day_series.str.strip().str.lower()

    df = pd.DataFrame({
        "day": days,
        "outcome": outcome_series.astype(str).str.strip(),
    })
    
    counts = df.groupby(["day", "outcome"]).size().reset_index(name="count")
    
    sns.barplot(
        data=counts,
        x="day",
        y="count",
        hue="outcome",
        palette={win: COLORS["win"], loss: COLORS["neutral"], be: COLORS["breakeven"]},
        order=DAY_ORDER,
        edgecolor=PLOT_DEFAULTS["edgecolor"],
        linewidth=PLOT_DEFAULTS["edge_linewidth"],
        ax=ax,
    )
    
    style_axes(ax, title, xlabel, ylabel)
    ax.spines["bottom"].set_visible(False)
    ax.legend(title="OUTCOMES", loc="best")
    
    return finalize_plot(fig)


def distribution_plot(
    series: pd.Series,
    title: str = "Distribution",
    xlabel: str = "",
    ylabel: str = "Frequency",
    dist_label: str = "R/R",
    figsize: tuple = PLOT_DEFAULTS["figsize"],
) -> Figure:
    """Plot histogram with KDE."""
    fig, ax = create_figure(figsize)
    
    sns.histplot(
        series,
        bins=10,
        kde=True,
        edgecolor=PLOT_DEFAULTS["edgecolor"],
        linewidth=PLOT_DEFAULTS["edge_linewidth"],
        ax=ax,
        label=dist_label,
    )
    
    style_axes(ax, title, xlabel, ylabel)
    ax.legend()
    
    return finalize_plot(fig)


def risk_vs_reward_scatter(
    risk_series: pd.Series,
    reward_series: pd.Series,
    outcome: pd.Series,
    title: str = "Risk vs Reward",
    xlabel: str = "Contracts",
    ylabel: str = "R/R",
    figsize: tuple = PLOT_DEFAULTS["figsize"],
) -> Figure:
    """Create scatter plot of risk vs reward."""
    fig, ax = create_figure(figsize)
    
    sns.scatterplot(
        x=risk_series,
        y=reward_series,
        hue=outcome,
        palette={"WIN": COLORS["win"], "LOSS": COLORS["loss"], "BE": COLORS["neutral"]},
        ax=ax,
    )
    
    style_axes(ax, title, xlabel, ylabel)
    ax.legend()
    
    return finalize_plot(fig)


def heatmap_rr(
    rr_series: pd.Series,
    days: pd.Series,
    entry_time: pd.Series,
    title: str = "Total R/R by Day & Hour",
    xlabel: str = "",
    ylabel: str = "Entry Hour",
    figsize: tuple = PLOT_DEFAULTS["figsize"],
) -> Figure:
    """Create heatmap of R/R by day and entry hour."""
    
    def parse_time(time_str):
        if pd.isna(time_str) or str(time_str).strip() == "":
            return pd.to_datetime("00:00", format="%H:%M").time()
        try:
            return pd.to_datetime(time_str, format="%H:%M:%S").time()
        except ValueError:
            try:
                return pd.to_datetime(str(time_str) + ":00", format="%H:%M:%S").time()
            except ValueError:
                return pd.to_datetime("00:00", format="%H:%M").time()

    fig, ax = create_figure(figsize)

    temp_df = pd.DataFrame({
        "rr": rr_series,
        "day": days.str.strip().str.lower(),
        "hour": entry_time.apply(parse_time).apply(lambda x: x.hour if pd.notna(x) else None),
    })
    
    temp_df = temp_df.dropna(subset=["rr", "hour", "day"])
    matrix = pd.pivot_table(temp_df, values="rr", index="hour", columns="day", aggfunc="sum")
    
    sns.heatmap(matrix, annot=True, cmap="RdBu_r", ax=ax)
    
    style_axes(ax, title, xlabel, ylabel)
    ax.tick_params(axis="y", rotation=0)
    
    return finalize_plot(fig)


def bar_outcomes_by_custom_ranges(
    outcome: pd.Series,
    entry_time: pd.Series,
    time_ranges: list,
    title: str = "Trade Outcomes by Time Range",
    xlabel: str = "Count",
    ylabel: str = "",
    figsize: tuple = PLOT_DEFAULTS["figsize"],
) -> Figure:
    """Create bar plot of outcomes by custom time ranges."""
    fig, ax = create_figure(figsize)

    df = pd.DataFrame({
        "outcome": outcome,
        "entry_time": pd.to_datetime(entry_time, format="%H:%M:%S").dt.time,
    })

    parsed_ranges = [
        (label, pd.to_datetime(start).time(), pd.to_datetime(end).time())
        for label, start, end in time_ranges
    ]

    data = []
    for label, start, end in parsed_ranges:
        range_data = df[(df["entry_time"] >= start) & (df["entry_time"] < end)]
        for outcome_type in ["WIN", "LOSS", "BE"]:
            count = range_data[range_data["outcome"] == outcome_type].shape[0]
            data.append({"Time Range": label, "Outcome": outcome_type, "Count": count})

    plot_df = pd.DataFrame(data)
    plot_df["Time Range"] = pd.Categorical(
        plot_df["Time Range"],
        categories=[label for label, _, _ in parsed_ranges],
        ordered=True,
    )

    sns.barplot(
        data=plot_df,
        y="Time Range",
        x="Count",
        hue="Outcome",
        palette={"WIN": COLORS["win"], "LOSS": COLORS["neutral"], "BE": COLORS["breakeven"]},
        linewidth=PLOT_DEFAULTS["edge_linewidth"],
        edgecolor=PLOT_DEFAULTS["edgecolor"],
        ax=ax,
        dodge=True,
    )

    style_axes(ax, title, xlabel, ylabel)
    ax.legend(title="OUTCOMES", loc="best")
    
    return finalize_plot(fig)


def rr_vs_hour_range_bubble_scatter(
    entry_time: pd.Series,
    rr_series: pd.Series,
    outcome: pd.Series,
    title: str = "R/R vs Entry Hour Range",
    xlabel: str = "Entry Time Range",
    ylabel: str = "R/R",
    figsize: tuple = PLOT_DEFAULTS["figsize"],
    size_scale: tuple = (50, 500),
) -> Figure:
    """Bubble scatter plot of R/R vs hour range."""
    fig, ax = create_figure(figsize)

    hour_ints = entry_time.apply(
        lambda t: pd.to_datetime(t).hour if isinstance(t, str) else t.hour
    )
    hour_ranges = hour_ints.apply(lambda h: f"{h:02d}:00–{(h + 1) % 24:02d}:00")

    df = pd.DataFrame({
        "hour_range": hour_ranges,
        "rr": rr_series,
        "outcome": outcome,
    })

    df["count"] = df.groupby(["hour_range", "rr", "outcome"])["rr"].transform("count")
    df_unique = df.drop_duplicates(subset=["hour_range", "rr", "outcome"]).copy()

    sorted_hours = sorted(df_unique["hour_range"].unique(), key=lambda x: int(x[:2]))
    df_unique["hour_range"] = pd.Categorical(
        df_unique["hour_range"], categories=sorted_hours, ordered=True
    )
    df_unique = df_unique.sort_values("hour_range")

    scatter = sns.scatterplot(
        data=df_unique,
        x="hour_range",
        y="rr",
        hue="outcome",
        size="count",
        sizes=size_scale,
        palette={"WIN": COLORS["win"], "LOSS": COLORS["loss"], "BE": "#888444"},
        edgecolor=PLOT_DEFAULTS["edgecolor"],
        alpha=0.8,
        ax=ax,
    )

    style_axes(ax, title, xlabel, ylabel, rotation=45)
    
    # Clean up legend
    handles, labels = scatter.get_legend_handles_labels()
    new_handles = []
    new_labels = []
    for h, l in zip(handles, labels):
        if l not in {"count", "outcome"} and not l.isdigit():
            new_handles.append(h)
            new_labels.append(l)
    ax.legend(new_handles, new_labels, title="Outcome", loc="upper right")
    
    return finalize_plot(fig)


def rr_vs_sl_points(
    sl_points_series: pd.Series,
    rr_series: pd.Series,
    outcome: pd.Series,
    title: str = "R/R vs SL Points",
    figsize: tuple = PLOT_DEFAULTS["figsize"],
    size_scale: tuple = (50, 500),
) -> Figure:
    """Scatter plot of R/R vs stop-loss points."""
    fig, ax = create_figure(figsize)
    
    sns.scatterplot(
        x=sl_points_series,
        y=rr_series,
        hue=outcome,
        sizes=size_scale,
        palette={"WIN": COLORS["win"], "LOSS": COLORS["loss"], "BE": "#888444"},
        edgecolor=PLOT_DEFAULTS["edgecolor"],
        alpha=0.8,
        ax=ax,
    )

    style_axes(ax, title, rotation=45)
    
    return finalize_plot(fig)


def create_stats_table(
    stats: dict,
    title: str = "Trading Performance Summary",
    figsize: tuple[int, int] = (8, 6),
    labelsize: int = 12,
) -> Figure:
    """Create a modern stats table."""
    fig, ax = create_figure(figsize)
    
    bg_color = "#010101"
    text_color = "#e0e0e0"
    accent_color = "#797979"
    
    ax.axis("off")
    fig.patch.set_facecolor(bg_color)

    table_data = [[k, v] for k, v in stats.items()]

    table = ax.table(
        cellText=table_data,
        loc="center",
        cellLoc="left",
        edges="open",
    )

    table.auto_set_font_size(False)
    table.set_fontsize(labelsize)
    table.scale(1.3, 1.6)

    for (i, j), cell in table.get_celld().items():
        cell.set_facecolor(bg_color)
        cell.set_text_props(color=text_color, weight="medium")
        cell.set_height(0.08)
        cell.PAD = 0.1
        
        if i % 2 == 0:
            cell.set_facecolor("#2a2a2a")
        
        cell.set_text_props(ha="left" if j == 0 else "right")

    plt.title(
        title,
        pad=30,
        color=accent_color,
        fontsize=labelsize + 4,
        weight="bold",
        fontfamily="sans-serif",
    )

    fig.patch.set_edgecolor(accent_color)
    fig.patch.set_linewidth(1)
    
    return finalize_plot(fig)

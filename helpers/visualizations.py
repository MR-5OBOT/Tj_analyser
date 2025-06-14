import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns


def pl_curve(
    pl_series: pd.Series,
    *,
    title: str = "Performance by (%)",
    xlabel: str = "Trades",
    ylabel: str = "",
    figsize: tuple = (8, 6),
    rotation: int = 0,
    labelsize: int = 10,
    dark_mode: bool = True,
):
    """
    Plots a cumulative line plot for percentage gains.

    Args:
        series (pd.Series): Percentage gains/losses.
        title (str): Plot title.
        xlabel (str): X-axis label.
        ylabel (str): Y-axis label.
        figsize (tuple): Figure size.
        rotation (int): X-axis label rotation.
        labelsize (int): Tick label size.
        dark_mode (bool): Use dark background if True.

    Returns:
        matplotlib.figure.Figure: The generated figure.
    """
    if dark_mode:
        plt.style.use("dark_background")

    fig, ax = plt.subplots(figsize=figsize)
    x = range(len(pl_series))
    sns.lineplot(x=x, y=pl_series.cumsum(), label="Gains (%)", color="#4B6661", ax=ax)

    ax.set_title(title)
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    ax.tick_params(axis="x", rotation=rotation, labelsize=labelsize, color="gray")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color("gray")
    ax.spines["bottom"].set_color("gray")
    ax.title.set_color("gray")
    ax.xaxis.label.set_color("gray")
    ax.yaxis.label.set_color("gray")
    ax.tick_params(colors="gray")
    ax.legend()
    fig.tight_layout()
    return fig


def rr_curve(
    rr_series: pd.Series,
    *,
    title: str = "Performance by (R/R)",
    xlabel: str = "Trades",
    ylabel: str = "",
    figsize: tuple = (8, 6),
    rotation: int = 0,
    labelsize: int = 10,
    dark_mode: bool = True,
):
    """
    Plots a cumulative line plot for risk/reward (R/R).

    Args:
        series (pd.Series): Risk/reward values.

    Returns:
        matplotlib.figure.Figure: The generated figure.
    """
    if dark_mode:
        plt.style.use("dark_background")

    fig, ax = plt.subplots(figsize=figsize)
    x = range(len(rr_series))
    sns.lineplot(x=x, y=rr_series.cumsum(), label="R/R", color="#4B6661", ax=ax)
    ax.set_title(title)
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    ax.tick_params(axis="x", rotation=rotation, labelsize=labelsize, color="gray")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color("gray")
    ax.spines["bottom"].set_color("gray")
    ax.title.set_color("gray")
    ax.xaxis.label.set_color("gray")
    ax.yaxis.label.set_color("gray")
    ax.tick_params(colors="gray")
    ax.legend()
    fig.tight_layout()
    return fig


def rr_curve_weekly(
    rr_series: pd.Series,
    days: pd.Series | None = None,
    dates: pd.Series | None = None,
    *,
    title: str = "Performance by R/R",
    xlabel: str = "",
    ylabel: str = "",
    figsize: tuple = (8, 6),
    rotation: int = 0,
    labelsize: float = 9.5,
    dark_mode: bool = True,
):
    """
    Plots a line plot of R/R by day of the week.

    Args:
        rr_series (pd.Series): Risk/reward values.
        days (pd.Series, optional): Day names. Takes precedence over dates.
        dates (pd.Series, optional): Date values to derive day names.
    Returns:
        matplotlib.figure.Figure: The generated figure or None if no valid x-axis data.
    """
    if dark_mode:
        plt.style.use("dark_background")

    fig, ax = plt.subplots(figsize=figsize)

    # Determine x values
    if days is not None:
        x_vals = days.str.lower()
    elif dates is not None:
        # x_vals = pd.to_datetime(dates, format="%Y-%m-%d").dt.day_name().str.lower()
        x_vals = pd.to_datetime(dates, errors="coerce").dt.day_name().str.lower()
    else:
        raise ValueError("No date or day series was provided!")

    # Compute cumulative sum
    cum_series = rr_series.cumsum()
    sns.lineplot(
        x=x_vals,
        y=cum_series,
        label="R/R",
        color="#4B6661",
        marker="o",
        linewidth=2,
        markersize=8,
        # zorder=3,
        ax=ax,
    )
    # plt.fill_between(x_vals, cum_series, color="#747474", alpha=0.2)
    # plt.ylim(min(cum_series) - 0.5, max(cum_series) + 0.5)
    ax.set_title(title)
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    ax.tick_params(axis="x", rotation=rotation, labelsize=labelsize, color="gray")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color("gray")
    ax.spines["bottom"].set_color("gray")
    ax.title.set_color("gray")
    ax.xaxis.label.set_color("gray")
    ax.yaxis.label.set_color("gray")
    ax.tick_params(colors="gray")
    ax.legend()
    fig.tight_layout()
    return fig


def rr_barplot(
    rr_series: pd.Series,
    days: pd.Series | None = None,
    dates: pd.Series | None = None,
    *,
    title: str = "R/R By Each Day",
    xlabel: str = "",
    ylabel: str = "",
    figsize: tuple = (8, 6),
    rotation: int = 0,
    labelsize: float = 9.5,
    dark_mode: bool = True,
):
    """
    Creates a bar plot of total R/R by day of the week.

    Args:
        rr_series (pd.Series): Raw risk/reward values.
        days (pd.Series, optional): Day names. Takes precedence over dates.
        dates (pd.Series, optional): Date values to derive day names.
    Returns:
        matplotlib.figure.Figure: The generated figure or None if no valid x-axis data.
    """
    if dark_mode:
        plt.style.use("dark_background")
    fig, ax = plt.subplots(figsize=figsize)

    # Get day labels
    if days is not None:
        day_labels = days.str.lower()
    elif dates is not None:
        day_labels = pd.to_datetime(dates, errors="coerce").dt.day_name().str.lower()
    else:
        raise ValueError("No date or day series was provided!")

    # Group raw R/R values by weekday and sum
    grouped_rr = rr_series.groupby(day_labels).sum()
    day_order = ["monday", "tuesday", "wednesday", "thursday", "friday"]
    ordered_rr = grouped_rr.reindex(day_order).dropna()

    sns.barplot(
        x=ordered_rr.index,
        y=ordered_rr.values,
        label="R/R",
        errorbar=None,
        color="#476A64",
        ax=ax,
        zorder=3,
    )
    plt.axhline(0, color="#515151", linestyle="-", linewidth=1)
    ax.set_title(title)
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    ax.tick_params(axis="x", rotation=rotation, labelsize=labelsize, color="gray")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color("gray")
    ax.spines["bottom"].set_color("gray")
    ax.title.set_color("gray")
    ax.xaxis.label.set_color("gray")
    ax.yaxis.label.set_color("gray")
    ax.tick_params(colors="gray")
    ax.legend()
    fig.tight_layout()
    return fig


def rr_barplot_months(
    rr_series: pd.Series,
    dates: pd.Series,
    *,
    title: str = "R/R By Each Month",
    xlabel: str = "",
    ylabel: str = "Total R/R",
    figsize: tuple = (8, 6),
    rotation: int = 45,
    labelsize: int = 10,
    dark_mode: bool = True,
):
    """Create a bar plot of summed R/R values by month from given dates.

    Args:
        rr_series: Series of R/R values.
        dates: Series of dates corresponding to R/R values.
    Returns:
        Matplotlib figure object.
    Raises:
        ValueError: If inputs are empty, mismatched, or dates are invalid.
    """
    # Set dark mode if specified
    if dark_mode:
        plt.style.use("dark_background")

    # Input validation
    if rr_series.empty or dates.empty:
        raise ValueError("Input series cannot be empty")
    if len(rr_series) != len(dates):
        raise ValueError("rr_series and dates must have the same length")

    # Convert dates to datetime
    dates = pd.to_datetime(dates, errors="coerce")
    if dates.isna().all():
        raise ValueError("No valid dates provided")

    # Create DataFrame
    df = pd.DataFrame({"dates": dates, "rr": rr_series})
    # Extract month, year, and month name
    df["month_num"] = df["dates"].dt.month
    df["year"] = df["dates"].dt.year
    df["month_name"] = df["dates"].dt.strftime("%b %Y")  # e.g., "Jan 2024"

    # Group by month_num, year, and month_name to sum R/R
    monthly_rr = (
        df.groupby(["year", "month_num", "month_name"])["rr"].sum().reset_index()
    )
    # Sort by year and month_num for calendar order
    monthly_rr = monthly_rr.sort_values(["year", "month_num"])

    # Dynamically adjust figure size based on number of months
    num_months = len(monthly_rr)
    if figsize is None:
        figsize = (max(8, num_months * 0.75), 6)  # Scale width with number of months

    # Create plot
    fig, ax = plt.subplots(figsize=figsize)
    sns.barplot(
        x="month_name",
        y="rr",
        data=monthly_rr,
        label="R/R",
        color="#476A64",
        errorbar=None,
        ax=ax,
    )
    ax.set_title(title)
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    plt.axhline(0, color="#515151", linestyle="-", linewidth=1)
    ax.tick_params(axis="x", rotation=rotation, labelsize=labelsize, color="gray")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color("gray")
    ax.spines["bottom"].set_color("gray")
    ax.title.set_color("gray")
    ax.xaxis.label.set_color("gray")
    ax.yaxis.label.set_color("gray")
    ax.tick_params(colors="gray")
    ax.legend()
    fig.tight_layout()
    return fig


def outcome_by_day(
    outcome_series: pd.Series,
    date_series: pd.Series = None,
    day_series: pd.Series = None,
    win: str = "WIN",
    loss: str = "LOSS",
    be: str = "BE",
    *,
    title: str = "Outcome by Day",
    xlabel: str = "",
    ylabel: str = "",
    figsize: tuple = (8, 6),
    rotation: int = 0,
    labelsize: int = 10,
    dark_mode: bool = True,
):
    """
    Creates a bar plot of outcome counts by day of the week.

    Args:
        date_series (pd.Series): Series of datetime values (optional).
        day_series (pd.Series): Series of weekday names (optional).
        outcome_series (pd.Series): Series with outcome values.
    Returns:
        matplotlib.figure.Figure: The generated figure.
    """
    if date_series is None and day_series is None:
        raise ValueError("Provide either date_series or day_series.")
    if dark_mode:
        plt.style.use("dark_background")

    fig, ax = plt.subplots(figsize=figsize)

    if date_series is not None:
        days = (
            # pd.to_datetime(date_series, format="%Y-%m-%d", errors="coerce")
            pd.to_datetime(date_series, errors="coerce").dt.day_name().str.lower()
        )
    else:
        days = day_series.str.strip().str.lower()

    df = pd.DataFrame(
        {
            "day": days,
            "outcome": outcome_series.astype(str).str.strip(),
        }
    )
    counts = df.groupby(["day", "outcome"]).size().reset_index(name="count")
    day_order = ["monday", "tuesday", "wednesday", "thursday", "friday"]
    sns.barplot(
        data=counts,
        x="day",
        y="count",
        hue="outcome",
        palette={win: "#466963", loss: "#333333", be: "#607250"},
        order=day_order,
        edgecolor="black",
        linewidth=1.5,
        ax=ax,
    )
    ax.set_title(title)
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    ax.tick_params(axis="x", rotation=rotation, labelsize=labelsize, color="gray")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["bottom"].set_visible(False)
    ax.spines["left"].set_color("gray")
    ax.spines["bottom"].set_color("gray")
    ax.title.set_color("gray")
    ax.xaxis.label.set_color("gray")
    ax.yaxis.label.set_color("gray")
    ax.tick_params(colors="gray")
    # ax.legend()
    fig.tight_layout()
    return fig


def distribution_plot(
    series: pd.Series,
    title: str = "Distribution",
    xlabel: str = "",
    ylabel: str = "Frequency",
    dist_label: str = "R/R",
    *,
    figsize: tuple = (8, 6),
    rotation: int = 0,
    labelsize: int = 10,
    dark_mode: bool = True,
):
    """
    Plots a histogram with KDE for a given series.

    Args:
        series (pd.Series): Data to plot.
    Returns:
        matplotlib.figure.Figure: The generated figure.
    """
    if dark_mode:
        plt.style.use("dark_background")

    fig, ax = plt.subplots(figsize=figsize)
    sns.histplot(
        series,
        bins=10,
        kde=True,
        edgecolor="black",
        linewidth=1.5,
        ax=ax,
        label=dist_label,
    )
    ax.set_title(title)
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    ax.tick_params(axis="x", rotation=rotation, labelsize=labelsize, color="gray")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color("gray")
    ax.spines["bottom"].set_color("gray")
    ax.title.set_color("gray")
    ax.xaxis.label.set_color("gray")
    ax.yaxis.label.set_color("gray")
    ax.tick_params(colors="gray")
    ax.legend()
    fig.tight_layout()
    return fig


def boxplot_DoW(
    series: pd.Series,
    days: pd.Series,
    outcome: pd.Series,
    *,
    title: str = "R/R by Day",
    xlabel: str = "",
    ylabel: str = "R/R",
    palette: str = "YlGnBu",
    figsize: tuple = (8, 6),
    rotation: int = 0,
    labelsize: int = 10,
    dark_mode: bool = True,
):
    """
    Creates a boxplot of the given series by day of the week and outcome.

    Args:
        series (pd.Series): Values to plot on the Y-axis.
        days (pd.Series): Corresponding day names.
        outcome (pd.Series): Used as hue.
    Returns:
        matplotlib.figure.Figure: The generated figure.
    """
    if dark_mode:
        plt.style.use("dark_background")

    fig, ax = plt.subplots(figsize=figsize)
    days = days.str.lower()
    sns.boxplot(x=days, y=series, hue=outcome, palette=palette, ax=ax)
    ax.set_title(title)
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    ax.tick_params(axis="x", rotation=rotation, labelsize=labelsize, color="gray")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color("gray")
    ax.spines["bottom"].set_color("gray")
    ax.title.set_color("gray")
    ax.xaxis.label.set_color("gray")
    ax.yaxis.label.set_color("gray")
    ax.tick_params(colors="gray")
    ax.legend()
    fig.tight_layout()
    return fig


def risk_vs_reward_scatter(
    risk_series: pd.Series,
    reward_series: pd.Series,
    outcome: pd.Series,
    *,
    title: str = "Risk vs Reward",
    xlabel: str = "Contract",
    ylabel: str = "R/R",
    figsize: tuple = (8, 6),
    rotation: int = 0,
    labelsize: int = 10,
    dark_mode: bool = True,
):
    """
    Creates a scatter plot of risk vs reward with outcome as hue.

    Args:
        risk_series (pd.Series): Risk values.
        reward_series (pd.Series): Reward values.
        outcome (pd.Series): Outcome values (e.g., 'WIN', 'LOSS', 'BE').
    Returns:
        matplotlib.figure.Figure: The generated figure.
    """
    if dark_mode:
        plt.style.use("dark_background")

    fig, ax = plt.subplots(figsize=figsize)
    sns.scatterplot(
        x=risk_series,
        y=reward_series,
        hue=outcome,
        palette={"WIN": "#466963", "LOSS": "#C05478", "BE": "#444333"},
        ax=ax,
    )
    ax.set_title(title)
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    ax.tick_params(axis="x", rotation=rotation, labelsize=labelsize, color="gray")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color("gray")
    ax.spines["bottom"].set_color("gray")
    ax.title.set_color("gray")
    ax.xaxis.label.set_color("gray")
    ax.yaxis.label.set_color("gray")
    ax.tick_params(colors="gray")
    ax.legend()
    fig.tight_layout()
    return fig


def heatmap_rr(
    rr_series: pd.Series,
    days: pd.Series,
    entry_time: pd.Series,
    *,
    title: str = "Total R/R by Day & Hour",
    xlabel: str = "",
    ylabel: str = "Entry Hour",
    figsize: tuple = (8, 6),
    rotation: int = 0,
    labelsize: int = 10,
    dark_mode: bool = True,
):
    """
    Creates a heatmap of R/R by day and entry hour.

    Args:
        rr_series (pd.Series): Risk/reward values.
        days (pd.Series): Day names.
        entry_time (pd.Series): Entry time values.
    Returns:
        matplotlib.figure.Figure: The generated figure.
    """

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

    if dark_mode:
        plt.style.use("dark_background")
    fig, ax = plt.subplots(figsize=figsize)

    temp_df = pd.DataFrame(
        {
            "rr": rr_series,
            "day": days.str.lower(),
            "hour": entry_time.apply(parse_time).apply(
                lambda x: x.hour if pd.notna(x) else None
            ),
        }
    )
    temp_df = temp_df.dropna(subset=["rr", "hour", "day"])
    matrix = pd.pivot_table(
        temp_df, values="rr", index="hour", columns="day", aggfunc="sum"
    )
    sns.heatmap(matrix, annot=True, cmap="RdBu_r", ax=ax)
    ax.set_title(title)
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    ax.tick_params(axis="x", rotation=rotation, labelsize=labelsize, color="gray")
    ax.tick_params(axis="y", rotation=0, labelsize=labelsize, color="gray")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color("gray")
    ax.spines["bottom"].set_color("gray")
    ax.title.set_color("gray")
    ax.xaxis.label.set_color("gray")
    ax.yaxis.label.set_color("gray")
    ax.tick_params(colors="gray")
    fig.tight_layout()
    return fig


def create_stats_table(
    stats: dict,
    *,
    title: str = "Trading Performance Summary",
    figsize: tuple = (8, 6),
    labelsize: int = 12,
    dark_mode: bool = True,
):
    """
    Creates a table of trading statistics.

    Args:
        stats (dict): Dictionary of statistic names and values.
    Returns:
        matplotlib.figure.Figure: The generated figure.
    """
    if dark_mode:
        plt.style.use("dark_background")

    fig, ax = plt.subplots(figsize=figsize)
    ax.axis("off")

    table_data = [[k, v] for k, v in stats.items()]
    table = ax.table(
        cellText=table_data,
        colLabels=["Statistic", "Value"],
        loc="center",
        cellLoc="center",
        colColours=["#111111", "#111111"],
    )
    table.auto_set_font_size(False)
    table.set_fontsize(labelsize)
    table.scale(1.2, 1.5)
    for (i, _), cell in table.get_celld().items():
        if i == 0:
            cell.set_facecolor("#111111")
            cell.set_text_props(color="white", weight="bold")
        else:
            cell.set_facecolor("#111111")
            cell.set_text_props(color="white")

    plt.title(title, pad=20, color="white")
    fig.tight_layout()
    return fig

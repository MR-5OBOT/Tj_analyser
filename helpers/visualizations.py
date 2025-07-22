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
    Plots a line plot of cumulative R/R by day of the week.

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
        x_vals = days.str.strip().str.lower()
    elif dates is not None:
        x_vals = (
            pd.to_datetime(dates, errors="coerce").dt.day_name().strip().str.lower()
        )
    else:
        raise ValueError("No date or day series was provided!")

    # Group R/R by day and sum
    grouped_rr = rr_series.groupby(x_vals).sum()
    day_order = ["monday", "tuesday", "wednesday", "thursday", "friday"]
    ordered_rr = grouped_rr.reindex(day_order).dropna()
    # ordered_rr = grouped_rr.reindex(day_order).fillna(0)  # Fill missing days with 0

    # Compute cumulative sum
    cum_series = ordered_rr.cumsum()
    # Plot line
    sns.lineplot(
        x=cum_series.index,
        y=cum_series.values,
        label="Cumulative R/R",
        color="#4B6661",
        marker="o",
        linewidth=2,
        markersize=8,
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
        day_labels = days.str.strip().str.lower()
    elif dates is not None:
        day_labels = (
            pd.to_datetime(dates, errors="coerce").dt.day_name().strip().str.lower()
        )
    else:
        raise ValueError("No date or day series was provided!")

    # Group raw R/R values by weekday and sum
    grouped_rr = rr_series.groupby(day_labels).sum()
    day_order = ["monday", "tuesday", "wednesday", "thursday", "friday"]
    ordered_rr = grouped_rr.reindex(day_order).dropna()
    # ordered_rr = grouped_rr.reindex(day_order).fillna(0)  # Fill missing days with 0

    sns.barplot(
        x=ordered_rr.index,
        y=ordered_rr.values,
        label="R/R",
        errorbar=None,
        color="#476A64",
        ax=ax,
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
            pd.to_datetime(date_series, errors="coerce")
            .dt.day_name()
            .strip()
            .str.lower()
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
    xlabel: str = "Contracts",
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
            "day": days.str.strip().str.lower(),
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


def bar_outcomes_by_custom_ranges(
    outcome: pd.Series,
    entry_time: pd.Series,
    *,
    title: str = "Trade Outcomes by Time Range",
    xlabel: str = "Count",
    ylabel: str = "",
    figsize: tuple = (8, 6),
    dark_mode: bool = True,
):
    if dark_mode:
        plt.style.use("dark_background")
    else:
        plt.style.use("default")

    # Prepare data
    df = pd.DataFrame(
        {
            "outcome": outcome,
            "entry_time": pd.to_datetime(entry_time, format="%H:%M:%S").dt.time,
        }
    )

    time_ranges = [
        ("08:00–08:30", "08:00", "08:30"),
        ("08:30–09:00", "08:30", "09:00"),
        ("09:00–09:30", "09:00", "09:30"),
        ("09:30–10:00", "09:30", "10:00"),
        ("10:00–11:00", "10:00", "11:00"),
    ]
    parsed_ranges = [
        (label, pd.to_datetime(start).time(), pd.to_datetime(end).time())
        for label, start, end in time_ranges
    ]

    data = []
    total_trades_all = 0  # Track overall total
    for label, start, end in parsed_ranges:
        range_data = df[(df["entry_time"] >= start) & (df["entry_time"] < end)]
        total_trades = range_data.shape[0]
        total_trades_all += total_trades

        for outcome_type in ["WIN", "LOSS", "BE"]:
            count = range_data[range_data["outcome"] == outcome_type].shape[0]
            data.append({"Time Range": label, "Outcome": outcome_type, "Count": count})

    plot_df = pd.DataFrame(data)

    # Ensure correct ordering
    plot_df["Time Range"] = pd.Categorical(
        plot_df["Time Range"],
        categories=[label for label, _, _ in parsed_ranges],
        ordered=True,
    )

    # Plot
    fig, ax = plt.subplots(figsize=figsize)
    sns.barplot(
        data=plot_df,
        y="Time Range",
        x="Count",
        hue="Outcome",
        palette={"WIN": "#466963", "LOSS": "#333333", "BE": "#607250"},
        linewidth=1.5,
        edgecolor="black",
        ax=ax,
        dodge=True,
    )

    # Style
    ax.set_title(title)
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    ax.tick_params(axis="x", labelsize=10)
    ax.tick_params(axis="y", labelsize=10)

    # Clean look
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    if dark_mode:
        ax.spines["left"].set_color("gray")
        ax.spines["bottom"].set_color("gray")
        ax.title.set_color("gray")
        ax.xaxis.label.set_color("gray")
        ax.yaxis.label.set_color("gray")
        ax.tick_params(colors="gray")
    else:
        ax.spines["left"].set_color("black")
        ax.spines["bottom"].set_color("black")

    # Legend
    ax.legend(title="Outcome", loc="upper right", frameon=True)
    fig.tight_layout()
    return fig


def rr_vs_hour_range_bubble_scatter(
    entry_time: pd.Series,
    rr_series: pd.Series,
    outcome: pd.Series,
    *,
    title: str = "R/R vs Entry Hour Range",
    xlabel: str = "Entry Time Range",
    ylabel: str = "R/R",
    figsize: tuple = (8, 6),
    rotation: int = 45,
    labelsize: int = 10,
    dark_mode: bool = True,
    size_scale: tuple = (50, 500),  # min and max bubble size
):
    """
    Scatter bubble plot of Risk/Reward vs Hour Range colored by outcome.
    Dot size reflects how many trades have the same R/R in that hour range.

    Args:
        entry_time (pd.Series): Time column (str like '09:35:00' or datetime).
        rr_series (pd.Series): Risk-Reward values.
        outcome (pd.Series): WIN, LOSS, BE values.
    Returns:
        matplotlib.figure.Figure
    """
    if dark_mode:
        plt.style.use("dark_background")

    # Extract hour and build hour range label
    hour_ints = entry_time.apply(
        lambda t: pd.to_datetime(t).hour if isinstance(t, str) else t.hour
    )
    hour_ranges = hour_ints.apply(lambda h: f"{h:02d}:00–{(h + 1) % 24:02d}:00")

    # Create a DataFrame with all relevant data
    df = pd.DataFrame(
        {
            "hour_range": hour_ranges,
            "rr": rr_series,
            "outcome": outcome,
        }
    )

    # Count duplicates by hour_range + rr + outcome (for bubble size)
    df["count"] = df.groupby(["hour_range", "rr", "outcome"])["rr"].transform("count")

    # Drop duplicates so each point appears once with size = count
    df_unique = df.drop_duplicates(subset=["hour_range", "rr", "outcome"]).copy()

    # Sort hour_range in chronological order
    sorted_hours = sorted(df_unique["hour_range"].unique(), key=lambda x: int(x[:2]))
    df_unique["hour_range"] = pd.Categorical(
        df_unique["hour_range"], categories=sorted_hours, ordered=True
    )
    df_unique = df_unique.sort_values("hour_range")

    fig, ax = plt.subplots(figsize=figsize)
    scatter = sns.scatterplot(
        data=df_unique,
        x="hour_range",
        y="rr",
        hue="outcome",
        size="count",
        sizes=size_scale,
        palette={"WIN": "#466963", "LOSS": "#C05478", "BE": "#888444"},
        edgecolor="black",
        alpha=0.8,
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

    # Adjust legend for size (count)
    handles, labels = scatter.get_legend_handles_labels()
    # Legend order is hue first, then size, so:
    # We'll remove old size legend and add a new one manually if needed.

    # Remove old size legend entries
    new_handles = []
    new_labels = []
    for h, l in zip(handles, labels):
        if l not in {"count", "outcome"} and not l.isdigit():
            new_handles.append(h)
            new_labels.append(l)
    ax.legend(new_handles, new_labels, title="Outcome", loc="upper right")

    fig.tight_layout()
    return fig


def create_stats_table(
    stats: dict,
    *,
    title: str = "Trading Performance Summary",
    figsize: tuple[int, int] = (8, 6),
    labelsize: int = 12,
    dark_mode: bool = True,
):
    """
    Creates a modern, headerless table of trading statistics with a sleek design.

    Args:
        stats (Dict): Dictionary of statistic names and values.

    Returns:
        matplotlib.figure.Figure: The generated figure with the styled table.
    """
    # Set style based on dark mode
    if dark_mode:
        plt.style.use("dark_background")
        bg_color = "#010101"
        text_color = "#e0e0e0"
        accent_color = "#797979"
    else:
        plt.style.use("default")
        bg_color = "#ffffff"
        text_color = "#333333"
        accent_color = "#2b6cb0"

    # Create figure and axis
    fig, ax = plt.subplots(figsize=figsize)
    ax.axis("off")
    fig.patch.set_facecolor(bg_color)

    # Prepare table data
    table_data = [[k, v] for k, v in stats.items()]

    # Create table without headers
    table = ax.table(
        cellText=table_data,
        loc="center",
        cellLoc="left",
        edges="open",  # Remove outer borders for modern look
    )

    # Style the table
    table.auto_set_font_size(False)
    table.set_fontsize(labelsize)
    table.scale(1.3, 1.6)  # Adjust table scaling for better spacing

    # Customize cell appearance
    for (i, j), cell in table.get_celld().items():
        cell.set_facecolor(bg_color)
        cell.set_text_props(color=text_color, weight="medium")
        cell.set_height(0.08)  # Increase row height for better readability
        cell.PAD = 0.1  # Add padding inside cells
        # Alternate row shading for visual distinction
        if i % 2 == 0:
            cell.set_facecolor("#2a2a2a" if dark_mode else "#f7fafc")
        # Left-align first column, right-align second column
        cell.set_text_props(ha="left" if j == 0 else "right")

    # Add a modern title
    plt.title(
        title,
        pad=30,
        color=accent_color,
        fontsize=labelsize + 4,
        weight="bold",
        fontfamily="sans-serif",
    )

    # Adjust layout and add subtle figure border
    fig.tight_layout()
    fig.patch.set_edgecolor(accent_color)
    fig.patch.set_linewidth(1)
    return fig

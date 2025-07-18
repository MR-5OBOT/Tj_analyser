import seaborn as sns
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from pathlib import Path
from tqdm import tqdm
import subprocess

from helpers.data_cleaning import *
from helpers.data_preprocessing import *
from helpers.formulas import *
from helpers.utils import *
from helpers.reports import *
from helpers.visualizations import *
from Tj_analyser import *

weekly_url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=1682820713&single=true&output=csv"
overall_url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=212787870&single=true&output=csv"
df = pd.read_csv(overall_url)
# df = pd.read_csv(weekly_url)

date = convert_to_datetime(df["date"], format="%Y-%m-%d")
day = df["day"]
rr_series = clean_numeric_series(df["R/R"])

# last to 50 rows
df_reduced = df.iloc[-30:]

outcome_series = df["outcome"]
entry_time = df["entry_time"]

# bar_losses_by_time_range(outcome_series, entry_time)
# plt.savefig("bar_losses_by_last_30Trades.png")
# plt.show()


def rr_vs_hour_range_bubble_scatter(
    entry_time: pd.Series,
    rr_series: pd.Series,
    outcome: pd.Series,
    *,
    title: str = "R/R vs Entry Hour Range",
    xlabel: str = "Entry Time Range",
    ylabel: str = "Risk/Reward Ratio",
    figsize: tuple = (12, 6),
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


fig = rr_vs_hour_range_bubble_scatter(
    entry_time=df["entry_time"], rr_series=df["R/R"], outcome=df["outcome"]
)
plt.show()

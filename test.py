import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

from helpers.stats import *
from helpers.utils import *


def outcome_by_day(df):
    df["date"] = pd.to_datetime(df["date"], format="mixed", dayfirst=True, errors="coerce")  # slow ~2 sec for 100k row
    df["DoW"] = df["date"].dt.day_name().str.lower()
    plt.style.use("dark_background")
    fig, ax = plt.subplots(figsize=(8, 6))
    data = df.groupby(["DoW", "outcome"]).size().reset_index(name="count")
    sns.barplot(
        data=data,
        x="DoW",
        y="count",
        hue="outcome",
        # palette="Paired",
        palette={
            "WIN": "#425E02",  # Lighter green for win
            "LOSS": "#300F1A",  # Lighter red for loss
            "BE": "#333333",  # Dark grey for BE
        },
        edgecolor="black",
        linewidth=1,
        ax=ax,
    )
    ax.set_title("Wins vs Losses by Day")
    ax.set_xlabel("")
    ax.set_ylabel("Count")
    fig.tight_layout()
    plt.show()
    return fig


def pl_distribution(pl):
    plt.style.use("dark_background")
    fig, ax = plt.subplots(figsize=(8, 6))
    sns.histplot(pl, bins=10, kde=True, ax=ax, edgecolor="black", linewidth=1.5)
    ax.set_title("P/L Distribution")
    ax.set_xlabel("Profit/Loss (%)")
    fig.tight_layout()
    plt.show()
    return fig


def risk_vs_reward_scatter(df, risk, pl):
    plt.style.use("dark_background")
    fig, ax = plt.subplots(figsize=(8, 6))
    sns.scatterplot(
        x=risk,
        y=pl,
        hue=df["outcome"],
        # palette="coolwarm",
        palette={
            "WIN": "#395202",
            "LOSS": "#C05478",
            "BE": "#333333",
        },
        ax=ax,
    )
    ax.set_title("Risk vs Reward")
    ax.set_xlabel("Risk (%)")
    ax.set_ylabel("Profit/Loss (%)")
    ax.legend()
    fig.tight_layout()
    plt.show()
    return fig


# Example usage
if __name__ == "__main__":
    url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=212787870&single=true&output=csv"
    df = pd.read_csv(url)
    # outcome_by_day(df)
    # pl = pl_raw(df)
    # risk = risk_raw(df)
    pl = np.random.uniform(-1.1, 3.1, 60)
    risk = np.random.uniform(0.5, 1.10, 60)
    risk_vs_reward_scatter(df, risk, pl)

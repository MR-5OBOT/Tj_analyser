import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns


def pl_curve(df, pl):
    plt.style.use("dark_background")
    fig, ax = plt.subplots(figsize=(8, 6))
    x = range(len(df))
    sns.lineplot(x=x, y=pl.cumsum(), label="Gains (%)", ax=ax)
    ax.set_title("Gains Curve")
    ax.set_xlabel("Trades")
    ax.set_ylabel("Profit/Loss (%)")
    ax.legend()
    ax.tick_params(axis="x", rotation=70, labelsize=8)
    fig.tight_layout()
    return fig


def outcome_by_day(df):
    df["date"] = pd.to_datetime(df["date"], format="mixed", dayfirst=True, errors="coerce")
    df["DoW"] = df["date"].dt.day_name().str.lower()
    plt.style.use("dark_background")
    fig, ax = plt.subplots(figsize=(8, 6))
    data = df.groupby(["DoW", "outcome"]).size().reset_index(name="count")
    sns.barplot(data=data, x="DoW", y="count", hue="outcome", palette="Paired", edgecolor="black", linewidth=1, ax=ax)
    ax.set_title("Wins vs Losses by Day")
    ax.set_xlabel("")
    ax.set_ylabel("Count")
    fig.tight_layout()
    return fig


def pl_distribution(pl):
    plt.style.use("dark_background")
    fig, ax = plt.subplots(figsize=(8, 6))
    sns.histplot(pl, bins=10, kde=True, ax=ax)
    ax.set_title("P/L Distribution")
    ax.set_xlabel("Profit/Loss (%)")
    fig.tight_layout()
    return fig


def boxplot_DoW(df, pl):
    df["date"] = pd.to_datetime(df["date"], format="mixed", dayfirst=True, errors="coerce")
    df["DoW"] = pd.to_datetime(df["date"]).dt.day_name().str.lower()
    plt.style.use("dark_background")
    fig, ax = plt.subplots(figsize=(8, 6))
    sns.boxplot(x=df["DoW"], y=pl, hue=df["outcome"], palette="YlGnBu", ax=ax)
    ax.set_title("P/L by Day")
    ax.set_xlabel("")
    ax.set_ylabel("Profit/Loss (%)")
    fig.tight_layout()
    return fig


def risk_vs_reward_scatter(df, pl):
    def safe_convert(x):
        """Converts a value to float, handling string percentages (e.g., '1%') and numeric values."""
        if pd.isna(x):
            return np.nan
        try:
            if isinstance(x, str):
                return float(x.rstrip("%")) / 100
            return float(x)
        except (ValueError, TypeError):
            return np.nan

    risk = df["risk_by_percentage"].apply(safe_convert)

    plt.style.use("dark_background")
    fig, ax = plt.subplots(figsize=(8, 6))
    sns.scatterplot(x=risk, y=pl, hue=df["outcome"], palette="coolwarm", ax=ax)
    ax.set_title("Risk vs Reward")
    ax.set_xlabel("Risk (%)")
    ax.set_ylabel("Profit/Loss (%)")
    ax.legend()
    fig.tight_layout()
    return fig


def heatmap_rr(df):
    def parse_time(time_str):
        try:
            return pd.to_datetime(time_str, format="%H:%M:%S").time()
        except ValueError:
            try:
                return pd.to_datetime(time_str + ":00", format="%H:%M:%S").time()
            except ValueError:
                return pd.to_datetime("00:00", format="%H:%M").time()

    df["DoW"] = pd.to_datetime(df["date"]).dt.day_name().str.lower()
    hours = df["entry_time"].apply(parse_time).apply(lambda x: x.hour if pd.notna(x) else None)
    matrix = pd.pivot_table(df, values="pl_by_rr", index=hours, columns="DoW", aggfunc="sum")

    plt.style.use("dark_background")
    fig, ax = plt.subplots(figsize=(8, 6))
    sns.heatmap(matrix, annot=True, cmap="RdBu_r", ax=ax)
    ax.set_title("Total R/R by Day & Hour")
    ax.set_xlabel("")
    ax.set_ylabel("Entry Hour")
    ax.tick_params(axis="y", rotation=0)
    fig.tight_layout()
    return fig


def create_stats_table(stats):
    # Create a figure with a table
    plt.style.use("dark_background")
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.axis("off")

    # Convert stats dictionary to a list of lists for the table
    table_data = [[k, v] for k, v in stats.items()]

    # Create the table
    table = ax.table(
        cellText=table_data,
        colLabels=["Statistic", "Value"],
        loc="center",
        cellLoc="center",
        colColours=["#111111", "#111111"],
    )

    # Style the table
    table.auto_set_font_size(False)
    table.set_fontsize(12)
    table.scale(1.2, 1.5)

    # Set background colors
    for (i, j), cell in table.get_celld().items():
        if i == 0:  # Header row
            cell.set_facecolor("#111111")
            cell.set_text_props(color="white", weight="bold")
        else:
            cell.set_facecolor("#111111")
            cell.set_text_props(color="white")

    plt.title("Trading Performance Summary", pad=20, color="white")
    plt.tight_layout()
    return fig

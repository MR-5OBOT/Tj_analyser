import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

def plot_gains_curve(df, pl):
    fig, ax = plt.subplots(figsize=(8, 6))
    plt.style.use("dark_background")
    x = range(len(df))
    sns.lineplot(x=x, y=pl, label="Gains (%)", ax=ax)
    ax.set_title("Gains Curve")
    ax.set_xlabel("Trades")
    ax.set_ylabel("P/L (%)")
    ax.legend()
    ax.tick_params(axis='x', rotation=70, labelsize=8)
    fig.tight_layout()
    return fig

def plot_outcome_by_day(df):
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["DoW"] = df["date"].dt.day_name().str.lower()
    fig, ax = plt.subplots(figsize=(8, 6))
    plt.style.use("dark_background")
    data = df.groupby(["DoW", "outcome"]).size().reset_index(name="count")
    sns.barplot(data=data, x="DoW", y="count", hue="outcome", palette="Paired", edgecolor="black", linewidth=1, ax=ax)
    ax.set_title("Wins vs Losses by Day")
    ax.set_xlabel("")
    ax.set_ylabel("Count")
    fig.tight_layout()
    return fig

def pl_distribution(pl_raw):
    fig, ax = plt.subplots(figsize=(8, 6))
    plt.style.use("dark_background")
    sns.histplot(pl_raw, bins=10, kde=True, ax=ax)
    ax.set_title("P/L Distribution")
    ax.set_xlabel("P/L (%)")
    fig.tight_layout()
    return fig

def boxplot_DoW(df, pl_raw):
    df["DoW"] = pd.to_datetime(df["date"]).dt.day_name().str.lower()
    fig, ax = plt.subplots(figsize=(8, 6))
    plt.style.use("dark_background")
    sns.boxplot(x=df["DoW"], y=pl_raw, hue=df["outcome"], palette="YlGnBu", ax=ax)
    ax.set_title("P/L by Day")
    ax.set_xlabel("")
    ax.set_ylabel("P/L (%)")
    fig.tight_layout()
    return fig

def risk_vs_reward_scatter(df, pl_raw):
    if df["risk_by_percentage"].dropna().apply(lambda x: isinstance(x, str) and x.endswith("%")).all():
        risk = df["risk_by_percentage"].str.replace("%", "").astype(float)
    else:
        risk = df["risk_by_percentage"] * 100
    fig, ax = plt.subplots(figsize=(8, 6))
    plt.style.use("dark_background")
    sns.scatterplot(x=risk, y=pl_raw, hue=df["outcome"], palette="coolwarm", ax=ax)
    ax.set_title("Risk vs Reward")
    ax.set_xlabel("Risk (%)")
    ax.set_ylabel("P/L (%)")
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
            except:
                return pd.to_datetime("00:00", format="%H:%M").time()

    df["DoW"] = pd.to_datetime(df["date"]).dt.day_name().str.lower()
    hours = df["entry_time"].apply(parse_time).apply(lambda x: x.hour if pd.notna(x) else None)
    matrix = pd.pivot_table(df, values="pl_by_rr", index=hours, columns="DoW", aggfunc="sum")
    fig, ax = plt.subplots(figsize=(8, 6))
    plt.style.use("dark_background")
    sns.heatmap(matrix, annot=True, cmap="RdBu_r", ax=ax)
    ax.set_title("P/L by Day & Hour")
    ax.set_xlabel("")
    ax.set_ylabel("Entry Hour")
    ax.tick_params(axis='y', rotation=0)
    fig.tight_layout()
    return fig

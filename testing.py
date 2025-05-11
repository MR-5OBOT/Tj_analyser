import seaborn as sns
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np


# from helpers.plots import *
from helpers.stats import risk_raw, pl_raw


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
    # plt.xlim(-1, 3)  # Set the x-axis limits
    # plt.ylim(-1, 3)  # Set the y-axis limits
    ax.set_title("Risk vs Reward")
    ax.set_xlabel("Risk (%)")
    ax.set_ylabel("Profit/Loss (%)")
    ax.legend()
    fig.tight_layout()
    plt.show()
    return fig


url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=212787870&single=true&output=csv"
df = pd.read_csv(url)
risk = risk_raw(df)
pl = pl_raw(df)

risk_vs_reward_scatter(df, risk, pl)

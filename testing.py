import os
import tkinter as tk
import webbrowser
from tkinter import filedialog, messagebox, ttk

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from matplotlib.backends.backend_pdf import PdfPages

df = pd.read_csv("./data/Tj_analyser.csv")


def plot_gains_curve(df, pl):
    # x = pd.to_datetime(df["date"]).dt.strftime("%d-%m-%y")
    x = range(len(df))
    plt.style.use("dark_background")
    sns.lineplot(x=x, y=pl)
    plt.title("Gains %")
    plt.xlabel("Trades")
    plt.ylabel("Cumulative P/L (%)")
    plt.legend()
    plt.xticks(rotation=70, fontsize=8)
    plt.tight_layout()
    plt.savefig("./exported_data/equity_curve.png")  # Save PNG, don’t close


def plot_outcome_by_day(df):
    df["DoW"] = pd.to_datetime(df["date"]).dt.day_name().str.lower()
    plt.style.use("dark_background")
    data = df.groupby(["DoW", "outcome"]).size().reset_index(name="count")
    sns.barplot(data=data, x="DoW", y="count", hue="outcome", palette="Paired", edgecolor="black", linewidth=1)
    plt.title("Wins and Losses by Day")
    plt.xlabel("")
    plt.ylabel("Count")
    plt.tight_layout()
    plt.savefig("./exported_data/outcome_by_day.png")


def pl_distribution(pl_raw):
    plt.style.use("dark_background")
    sns.histplot(pl_raw, bins=10, kde=True)
    plt.title("Distribution of P/L by %")
    plt.xlabel("P/L (%)")
    plt.tight_layout()
    plt.savefig("./exported_data/pl_distribution.png")


def boxplot_DoW(df, pl_raw):
    df["DoW"] = pd.to_datetime(df["date"]).dt.day_name().str.lower()
    plt.style.use("dark_background")
    sns.boxplot(x=df["DoW"], y=pl_raw, hue=df["outcome"], palette="YlGnBu")
    plt.title("Boxplot of P/L by Day")
    plt.xlabel("")
    plt.ylabel("P/L (%)")
    plt.tight_layout()
    plt.savefig("./exported_data/boxplot_DoW_vs_PL.png")


def risk_vs_reward_scatter(df):
    risk = np.array([x for x in np.random.uniform(1, 2.1, len(df))])
    pl = np.array([x for x in np.random.uniform(-1, 3.1, len(df))])

    plt.style.use("dark_background")
    sns.scatterplot(x=risk, y=pl, hue=df["outcome"], palette="coolwarm")
    plt.title("Risk vs Reward")
    plt.xlabel("Risk (%)")
    plt.ylabel("P/L (%)")
    plt.legend()
    plt.tight_layout()
    plt.savefig("./exported_data/risk_vs_reward.png")
    plt.show()


risk_vs_reward_scatter(df)


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
    plt.style.use("dark_background")
    sns.heatmap(matrix, annot=True, cmap="RdBu_r")
    plt.title("Cumulative P/L by Days vs Hours")
    plt.xlabel("")
    plt.ylabel("Hour of Entry")
    plt.yticks(rotation=0)
    plt.tight_layout()
    plt.savefig("./exported_data/days_vs_hours_pl.png")

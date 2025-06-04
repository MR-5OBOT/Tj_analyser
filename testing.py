import seaborn as sns
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np

from DA_helpers.visualizations import rr_barplot_months

from DA_helpers.data_cleaning import *
from DA_helpers.H.pl_plots import *
from DA_helpers.H.rr_plots import *


weekly_url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=1682820713&single=true&output=csv"
df = pd.read_csv(weekly_url)
print(df.head())

rr = clean_numeric_series(df["pl_by_rr"])
days = df["date"]

rr_barplot(rr, date_series=days)
plt.show()


# def plot_trading_radar_dark(metrics: dict, title="Trading Performance Radar"):
#     """
#     Plot a dark-themed radar chart for trading performance metrics.
#
#     Parameters:
#     - metrics: dict of {label: value}, where value can be float/int
#     - title: title of the chart
#     """
#     # Extract labels and values
#     labels = list(metrics.keys())
#     values = list(metrics.values())
#     num_vars = len(labels)
#
#     # Create angle values
#     angles = np.linspace(0, 2 * np.pi, num_vars, endpoint=False).tolist()
#     values += values[:1]
#     angles += angles[:1]
#     # Set dark style
#     plt.style.use("dark_background")
#     # Plot
#     fig, ax = plt.subplots(figsize=(6, 6), subplot_kw=dict(polar=True))
#     ax.plot(angles, values, linewidth=2)
#     ax.fill(angles, values, alpha=0.3)
#
#     ax.set_xticks(angles[:-1])
#     ax.set_xticklabels(labels, color="white", size=10)
#
#     ax.set_yticklabels([])  # Remove radial labels
#     ax.grid(color="gray", linestyle="dotted", alpha=0.4)
#
#     plt.title(title, size=14, color="gray", pad=20)
#     plt.tight_layout()
#     plt.show()
#     return fig
#
#
# metrics = {
#     "Win Rate": 0.65,
#     "Risk/Reward": 1.7,
#     "Drawdown": 0.25,
#     "Profit/Loss": 1.9,
# }
#
# plot_trading_radar_dark(metrics)

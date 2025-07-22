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
# df = pd.read_csv(overall_url)
# df = pd.read_csv(weekly_url)

# date = convert_to_datetime(df["date"], format="%Y-%m-%d")
# day = df["day"]
# rr_series = clean_numeric_series(df["R/R"])
#
# # last to 50 rows
# df_reduced = df.iloc[-30:]
#
# outcome_series = df["outcome"]
# entry_time = df["entry_time"]

backtest_tpl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=616999731&single=true&output=csv"
df = pd.read_csv(backtest_tpl)
outcomes = df["outcome"]
# bar_losses_by_time_range(outcome_series, entry_time)
# plt.savefig("bar_losses_by_last_30Trades.png")
# plt.show()

print(winning_trades(df))
print(losing_trades(df))
print(f"Fsociety model winrate is: {winrate(outcomes)[0] * 100:.2f}%")

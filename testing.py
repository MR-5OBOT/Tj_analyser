import seaborn as sns
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from pathlib import Path
from tqdm import tqdm
import subprocess

from helpers.data_cleaning import *
from helpers.data_preprocessing import *
from helpers.calculations import *
from helpers.utils import *
from helpers.reports import *
from helpers.visualizations import *
from Tj_analyser import *

weekly_url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=1682820713&single=true&output=csv"
overall_removed_data = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=2113128113&single=true&output=csv"
overall_main = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=1587441688&single=true&output=csv"
df = pd.read_csv(overall_main)
# df = pd.read_csv(weekly_url)

outcome_series = df["outcome"]
entry_time = df["entry_time"]

time_ranges = [
    ("09:00–11:00", "09:00", "11:00"),
    # ("08:00–09:00", "08:00", "09:00"),
    # ("09:00–09:30", "09:00", "09:30"),
    # ("09:30–10:00", "09:30", "10:00"),
    # ("10:00–11:00", "10:00", "11:00"),
]

print(time_ranges_stats(outcome_series, entry_time, time_ranges))
# print(bar_outcomes_by_custom_ranges(outcome_series, entry_time))
# plt.show()


df["entry_time"] = pd.to_datetime(df["entry_time"], format="%H:%M:%S").dt.time
df = df[(df["entry_time"] >= time(9, 0)) & (df["entry_time"] <= time(11, 0))]
df.to_csv("removed_data.csv", index=False)

# print(df.head(30))

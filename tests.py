import matplotlib.pyplot as plt
import pandas as pd

from helpers.stats import *
# from live_fetch import *

url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=212787870&single=true&output=csv"
df = pd.read_csv(url)


term_stats(df)
# print()
# print("STATS:")
# print(f"WINRATE: {winrate(df):.2f}%")
# print(f"BE RATE: {breakevenRate(df):.2f}%")
# avg_wl(df)

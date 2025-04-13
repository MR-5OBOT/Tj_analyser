import matplotlib.pyplot as plt
import pandas as pd

from helpers.stats import avg_win, calc_stats, breakevenRate
from live_fetch import url, term_stats

df = pd.read_csv(url())


# term_stats(df)
print(f"BE RATE: {breakevenRate(df):.2f}%")
print()
print(f"AVG WIN: {avg_win(df):.2f}%")

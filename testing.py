import seaborn as sns
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np

from DA_helpers.data_cleaning import clean_numeric_series
from DA_helpers.visualizations import *


url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=212787870&single=true&output=csv"
df = pd.read_csv(url)

pl_series = clean_numeric_series(df["pl_by_percentage"])

rr_barplot(df, pl_series)
plt.show()

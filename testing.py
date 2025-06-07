import seaborn as sns
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from pathlib import Path
from tqdm import tqdm
import subprocess

from DA_helpers.data_cleaning import *
from DA_helpers.data_preprocessing import *
from DA_helpers.formulas import *
from DA_helpers.utils import *
from DA_helpers.reports import *
from DA_helpers.visualizations import *

weekly_url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=1682820713&single=true&output=csv"
overall_url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=212787870&single=true&output=csv"
df = pd.read_csv(overall_url)
# df = pd.read_csv(weekly_url)

outcome_series = df["outcome"]
date = convert_to_datetime(df["date"], format="%Y-%m-%d")
day = df["day"]
rr_series = clean_numeric_series(df["R/R"])

# fig = outcome_by_day(outcome_series, None, day, "WIN", "LOSS", "BE")
# fig = rr_curve(rr_series)
# fig = rr_curve_weekly(rr_series, day)
# fig = rr_barplot(rr_series, day)
fig = rr_barplot_months(rr_series, date)
pdf_path = "testing.pdf"
fig.savefig(pdf_path)

# Open the PDF using xdg-open
subprocess.run(["thorium-browser", pdf_path], check=True)

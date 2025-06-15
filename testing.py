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
df = pd.read_csv(overall_url)
# df = pd.read_csv(weekly_url)

outcome_series = df["outcome"]
date = convert_to_datetime(df["date"], format="%Y-%m-%d")
day = df["day"]
rr_series = clean_numeric_series(df["R/R"])
entry_time = df["entry_time"]

# pdf_path = "testing.pdf"
# plt.savefig(pdf_path)

# Open the PDF using xdg-open
# subprocess.run(["thorium-browser", pdf_path], check=True)

print(profit_factor(rr_series))

import matplotlib.pyplot as plt
import pandas as pd

from helpers.stats import *

# from live_fetch import *

url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=212787870&single=true&output=csv"
df = pd.read_csv(url)


def winrate(df: pd.DataFrame) -> float:
    wins = (df["outcome"] == "WIN").sum()
    losses = (df["outcome"] == "LOSS").sum()
    wr = (wins / (wins + losses)) if (wins + losses) > 0 else 0.0
    return wr


def avg_wl(df: pd.DataFrame) -> tuple[float, float]:
    if df is None or df.empty or df["pl_by_percentage"].empty:
        return 0.0, 0.0

    clean_pl = (
        df["pl_by_percentage"].str.replace("%", "").astype(float)
        if df["pl_by_percentage"].dtype == "object"
        else df["pl_by_percentage"] * 100
    )
    avg_win = clean_pl[clean_pl > 0].mean()
    avg_loss = abs(clean_pl[clean_pl < 0].mean())  # <-- Make loss positive here

    avg_win = 0.0 if pd.isna(avg_win) else avg_win
    avg_loss = 0.0 if pd.isna(avg_loss) else avg_loss

    return avg_win, avg_loss


def expectency(df: pd.DataFrame) -> float:
    wr = winrate(df)
    lr = 1 - wr
    avg_w = avg_wl(df)[0]
    avg_l = avg_wl(df)[1]

    expectency = (wr * avg_w) - (lr * avg_l)
    return expectency


# Run the function
# result = expectency(df)
# print(f"Expectancy: {result}")

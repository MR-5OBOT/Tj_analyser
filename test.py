import pandas as pd

from helpers.utils import df_check


def consecutive_losses(df: pd.DataFrame) -> int:
    df_check(df, ["outcome"])
    if df["outcome"].empty:
        return 0

    current_streak = 0
    max_streak = 0
    for outcome in df["outcome"]:
        if outcome == "LOSS":
            current_streak += 1
            max_streak = max(max_streak, current_streak)
            print(max_streak)
        else:
            current_streak = 0
    return max_streak


url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=212787870&single=true&output=csv"
df = pd.read_csv(url)

print(consecutive_losses(df))
# print(df["pl_by_percentage"].head(-1))

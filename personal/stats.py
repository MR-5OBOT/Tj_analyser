import numpy as np
import pandas as pd


def winrate(df: pd.DataFrame) -> tuple[float, float]:
    if df["outcome"].empty:
        return 0.0, 0.0
    outcomes = df["outcome"]
    wins = (outcomes == "WIN").sum()
    losses = (outcomes == "LOSS").sum()

    wr = (wins / (wins + losses)) if (wins + losses) > 0 else 0.0
    wr_with_be = (wins / (len(df["outcome"]))) if (wins + losses) > 0 else 0.0
    return wr, wr_with_be


def winning_trades(df: pd.DataFrame) -> int:
    if df["outcome"].empty:
        return 0
    outcomes = df["outcome"]
    wins = (outcomes == "WIN").sum()
    return wins


def breakevens_trades(df: pd.DataFrame) -> int:
    if df["outcome"].empty:
        return 0
    outcomes = df["outcome"]
    be = (outcomes == "BE").sum()
    return be


def lossing_trades(df: pd.DataFrame) -> int:
    if df["outcome"].empty:
        return 0
    outcomes = df["outcome"]
    losses = (outcomes == "LOSS").sum()
    return losses


def consecutive_losses(df: pd.DataFrame) -> int:
    if df["outcome"].empty:
        return 0

    current_streak = 0
    max_streak = 0
    for outcome in df["outcome"]:
        if outcome == "LOSS":
            current_streak += 1
            max_streak = max(max_streak, current_streak)
        else:
            current_streak = 0
    return max_streak

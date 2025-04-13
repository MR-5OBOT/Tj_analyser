import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

### this only works with teh right csv template ###


def calc_stats(df):
    required_cols = ["date", "outcome", "pl_by_percentage", "risk_by_percentage", "entry_time", "exit_time", "pl_by_rr"]
    if not all(col in df.columns for col in required_cols):
        raise ValueError(f"Missing required columns: {', '.join(required_cols)}")

    # Overall Stats
    wins = df["outcome"].value_counts().get("WIN", 0)
    losses = df["outcome"].value_counts().get("LOSS", 0)
    winrate = (wins / (wins + losses)) * 100 if (wins + losses) > 0 else 0.0
    pl_raw = (
        df["pl_by_percentage"].str.replace("%", "").astype(float)
        if df["pl_by_percentage"].dtype == "object"
        else df["pl_by_percentage"] * 100
    )
    pl = pl_raw.cumsum()
    total_pl = pl_raw.sum()
    avg_win = pl_raw[pl_raw > 0].mean() or 0
    avg_loss = pl_raw[pl_raw < 0].mean() or 0
    risk_converted = (
        df["risk_by_percentage"].str.replace("%", "").astype(float)
        if df["risk_by_percentage"].dtype == "object"
        else df["risk_by_percentage"] * 100
    )
    avg_risk = risk_converted.mean() or 0
    avg_rr = df["pl_by_rr"].mean() or 0
    best_trade = pl_raw.max() or 0
    worst_trade = pl_raw.min() or 0
    df_copy = df.copy()
    df_copy["peak"] = pl_raw.cummax()
    df_copy["drawdown"] = (df_copy["peak"] - pl_raw) / df_copy["peak"]
    max_dd = df_copy["drawdown"].max() or 0

    stats = {
        "Total Trades": len(df),
        "Win Rate": f"{winrate:.2f}%",
        "Total P/L": f"{total_pl:.2f}%",
        "Avg Win": f"{avg_win:.2f}%",
        "Avg Loss": f"{avg_loss:.2f}%",
        "Avg Risk": f"{avg_risk:.2f}%",
        "Avg R/R": f"{avg_rr:.2f}",
        "Best Trade": f"{best_trade:.2f}%",
        "Worst Trade": f"{worst_trade:.2f}%",
        "Max DD": f"{max_dd:.2f}%",
        "Min Trade duration": f"{advanced_time_stats(df)[1]:.0f} Minutes",
        "Max Trade duration": f"{advanced_time_stats(df)[2]:.0f} Minutes",
    }
    return pl, pl_raw, stats


# advanced time based stats
def advanced_time_stats(df):
    df["entry_time"] = pd.to_datetime(df["entry_time"], format="%H:%M:%S")
    df["exit_time"] = pd.to_datetime(df["exit_time"], format="%H:%M:%S")

    df["duration_minutes"] = (df["exit_time"] - df["entry_time"]).dt.total_seconds() / 60

    # Filter only the rows where 'outcome' is "WIN" and 'duration_minutes' > 0
    only_wins = df[(df["duration_minutes"] > 0) & (df["outcome"] == "WIN")]["duration_minutes"]
    min_duration = only_wins.min()
    max_duration = df["duration_minutes"].max()
    return only_wins, min_duration, max_duration


def avg_win(df: pd.DataFrame) -> float:
    if df is None or df.empty or df["pl_by_percentage"].empty:
        return 0.0
    clean_pl = (
        df["pl_by_percentage"].str.replace("%", "").astype(float)
        if df["pl_by_percentage"].dtype == "object"
        else df["pl_by_percentage"] * 100
    )
    wins = clean_pl[clean_pl > 0]
    avg_win_value = wins.mean()

    return 0.0 if pd.isna(avg_win_value) else avg_win_value

def avg_wl(df: pd.DataFrame) -> tuple[float, float]:
    if df is None or df.empty or df["pl_by_percentage"].empty:
        return 0.0, 0.0
    clean_pl = (
        df["pl_by_percentage"].str.replace("%", "").astype(float)
        if df["pl_by_percentage"].dtype == "object"
        else df["pl_by_percentage"] * 100
    )
    avg_win = clean_pl[clean_pl > 0].mean()
    avg_loss = clean_pl[clean_pl < 0].mean()
    # Handle NaNs safely
    avg_win = 0.0 if pd.isna(avg_win) else avg_win
    avg_loss = 0.0 if pd.isna(avg_loss) else avg_loss

    print(f"Average Win: {avg_win:.2f}%")
    print(f"Average Loss: {avg_loss:.2f}%")
    return avg_win, avg_loss


def breakevenRate(df: pd.DataFrame) -> float:
    if df is None or df.empty or df["outcome"].empty:
        return 0.0
    count = df["outcome"].value_counts().get("BE", 0)
    if len(df) == 0:
        return 0.0
    be = count / df.shape[0] * 100
    return be


def expectency(df: pd.DataFrame, expected_value: float) -> float:
    wins = df["outcome"].value_counts().get("WIN", 0)
    losses = df["outcome"].value_counts().get("LOSS", 0)
    # winrate = (wins / (wins + losses)) * 100 if (wins + losses) > 0 else 0.0

    # formula
    # Expectancy = (Win Rate × Avg Win) - (Loss Rate × Avg Loss)

    return expected_value

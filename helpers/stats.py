import pandas as pd

### this only works with teh right csv template ###


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


def pl_series(df) -> pd.Series:
    pl_raw = (
        df["pl_by_percentage"].str.replace("%", "").astype(float)
        if df["pl_by_percentage"].dtype == "object"
        else df["pl_by_percentage"] * 100
    )
    # return clean_pl.cumsum()
    return pl_raw


def total_pl(df: pd.DataFrame) -> float:
    pl_raw = (
        df["pl_by_percentage"].str.replace("%", "").astype(float)
        if df["pl_by_percentage"].dtype == "object"
        else df["pl_by_percentage"] * 100
    )
    pl = pl_raw.sum()
    return pl


def winrate(df: pd.DataFrame) -> float:
    wins = (df["outcome"] == "WIN").sum()
    losses = (df["outcome"] == "LOSS").sum()
    wr = (wins / (wins + losses)) if (wins + losses) > 0 else 0.0
    return wr


def avg_wl(df: pd.DataFrame) -> tuple[float, float]:
    if df is None or df.empty or df["pl_by_percentage"].empty:
        return 0.0, 0.0

    pl_raw = (
        df["pl_by_percentage"].str.replace("%", "").astype(float)
        if df["pl_by_percentage"].dtype == "object"
        else df["pl_by_percentage"] * 100
    )
    avg_win = pl_raw[pl_raw > 0].mean()
    avg_loss = abs(pl_raw[pl_raw < 0].mean())  # <-- Make loss positive here

    avg_win = 0.0 if pd.isna(avg_win) else avg_win
    avg_loss = 0.0 if pd.isna(avg_loss) else avg_loss

    return avg_win, avg_loss


def avg_risk(df: pd.DataFrame) -> float:
    if df is None or df.empty or df["pl_by_rr"].empty:
        return 0.0
    risk_converted = (
        df["risk_by_percentage"].str.replace("%", "").astype(float)
        if df["risk_by_percentage"].dtype == "object"
        else df["risk_by_percentage"] * 100
    )
    avg_r = risk_converted.mean() or 0.0
    return avg_r


def avg_rr(df: pd.DataFrame):
    if df is None or "pl_by_rr" not in df:
        return 0.0
    valid_data = df["pl_by_rr"].dropna()
    if valid_data.empty:
        return 0.0
    return valid_data.mean()


def best_trade(df: pd.DataFrame) -> float:
    if df is None or "pl_by_percentage" not in df or df["pl_by_percentage"].dropna().empty:
        return 0.0
    clean_pl = (
        df["pl_by_percentage"].str.replace("%", "").astype(float)
        if df["pl_by_percentage"].dtype == "object"
        else df["pl_by_percentage"] * 100
    )
    best_trade_value = clean_pl.max() or 0.0
    return best_trade_value


def worst_trade(df: pd.DataFrame) -> float:
    if df is None or "pl_by_percentage" not in df or df["pl_by_percentage"].dropna().empty:
        return 0.0
    clean_pl = (
        df["pl_by_percentage"].str.replace("%", "").astype(float)
        if df["pl_by_percentage"].dtype == "object"
        else df["pl_by_percentage"] * 100
    )
    best_trade_value = clean_pl.min() or 0.0
    return best_trade_value


def max_drawdown(df: pd.DataFrame) -> float:
    pl_raw = (
        df["pl_by_percentage"].str.replace("%", "", regex=False).astype(float)
        if df["pl_by_percentage"].dtype == "object"
        else df["pl_by_percentage"] * 100
    )
    peak = pl_raw.cummax()
    dd = (peak - pl_raw) / peak
    max_dd = dd.max() if not dd.empty else 0.0
    return max_dd


def expectency(df: pd.DataFrame) -> float:
    wr = winrate(df)
    lr = 1 - wr
    avg_w = avg_wl(df)[0]
    avg_l = avg_wl(df)[1]

    expectency = (wr * avg_w) - (lr * avg_l)
    return expectency


def stats_table(df: pd.DataFrame) -> dict:
    if df is None or df.empty:
        print("No data to process.")
    stats = {
        "Total Trades": len(df),
        "Win Rate": f"{(winrate(df) * 100):.2f}%",
        "Expectency": f"{expectency(df):.2f}%",
        "Total P/L": f"{total_pl(df):.2f}%",
        "Avg Win": f"{avg_wl(df)[0]:.2f}%",
        "Avg Loss": f"{avg_wl(df)[1]:.2f}%",
        "Avg Risk": f"{avg_risk(df):.2f}%",
        "Avg R/R": f"{avg_rr(df):.2f}",
        "Best Trade": f"{best_trade(df):.2f}%",
        "Worst Trade": f"{worst_trade(df):.2f}%",
        "Max Drawdown": f"{max_drawdown(df):.2f}%",
        "Min Trade duration": f"{advanced_time_stats(df)[1]:.0f} Minutes",
        "Max Trade duration": f"{advanced_time_stats(df)[2]:.0f} Minutes",
    }
    return stats


def term_stats(stats: dict):
    for key, value in stats.items():
        print(f"{key}: {value}")
    return

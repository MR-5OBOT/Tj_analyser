import numpy as np
import pandas as pd

### this only works with the right csv template ###


def df_check(df: pd.DataFrame, required_columns: list[str]) -> None:
    if df is None or df.empty:
        raise ValueError("DataFrame is None or empty.")
    default_columns = [
        "date",
        "outcome",
        "pl_by_percentage",
        "risk_by_percentage",
        "entry_time",
        "exit_time",
        "pl_by_rr",
    ]
    columns_to_check = required_columns if required_columns is not None else default_columns
    missing_columns = [col for col in columns_to_check if col not in df.columns]
    if missing_columns:
        raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")


### Utility Function ###
def convert_value(x):
    """Converts a value to float, handling string percentages (e.g., '1%') and numeric values."""
    if pd.isna(x):
        return np.nan
    try:
        if isinstance(x, str):
            return float(x.rstrip("%")) / 100
        return float(x)
    except (ValueError, TypeError):
        return np.nan


# Handle all possible ways
def pl_raw(df: pd.DataFrame) -> pd.Series:
    """Converts profit/loss percentages to a float Series, handling strings and numeric values."""

    df_check(df, ["pl_by_percentage"])
    if df["pl_by_percentage"].empty:
        return pd.Series(dtype=float)

    pl_series = df["pl_by_percentage"].apply(convert_value)  # Use shared utility function
    return pd.Series(pl_series, dtype=float)


def winrate(df: pd.DataFrame) -> tuple[float, float]:
    df_check(df, ["outcome"])
    if df["outcome"].empty:
        return 0.0, 0.0

    outcomes = df["outcome"]
    wins = (outcomes == "WIN").sum()
    losses = (outcomes == "LOSS").sum()

    wr = (wins / (wins + losses)) if (wins + losses) > 0 else 0.0
    wr_with_be = (wins / (len(df["outcome"]))) if (wins + losses) > 0 else 0.0

    return wr, wr_with_be


def wining_trades(df: pd.DataFrame) -> float:
    df_check(df, ["outcome"])
    if df["outcome"].empty:
        return 0.0
    outcomes = df["outcome"]
    wins = (outcomes == "WIN").sum()
    return wins


def breakevens_trades(df: pd.DataFrame) -> float:
    df_check(df, ["outcome"])
    if df["outcome"].empty:
        return 0.0
    outcomes = df["outcome"]
    be = (outcomes == "BE").sum()
    return be


def lossing_trades(df: pd.DataFrame) -> float:
    df_check(df, ["outcome"])
    if df["outcome"].empty:
        return 0.0
    outcomes = df["outcome"]
    losses = (outcomes == "LOSS").sum()
    return losses


def avg_wl(df: pd.DataFrame) -> tuple[float, float]:
    df_check(df, ["pl_by_percentage"])
    if df["pl_by_percentage"].empty:
        return 0.0, 0.0

    pl_series = df["pl_by_percentage"].apply(convert_value)  # Use shared utility function
    avg_win = pl_series[pl_series > 0].mean()
    avg_loss = abs(pl_series[pl_series < 0].mean())  # <-- Make loss positive here

    avg_win = 0.0 if pd.isna(avg_win) else avg_win
    avg_loss = 0.0 if pd.isna(avg_loss) else avg_loss

    return float(avg_win), float(avg_loss)


def avg_risk(df: pd.DataFrame) -> float:
    df_check(df, ["risk_by_percentage"])
    if df["risk_by_percentage"].empty:
        return 0.0
    pl_series = df["pl_by_percentage"].apply(convert_value)  # Use shared utility function
    avg_r = pl_series.mean() or 0.0
    return float(avg_r)


def avg_rr(df: pd.DataFrame) -> float:
    df_check(df, ["pl_by_rr"])
    if df["pl_by_rr"].empty:
        return 0.0
    valid_data = df["pl_by_rr"].dropna()
    if valid_data.empty:
        return 0.0
    return float(valid_data.mean())


def best_worst_trade(df: pd.DataFrame) -> tuple[float, float]:
    df_check(df, ["pl_by_percentage"])
    if df["pl_by_percentage"].empty:
        return 0.0, 0.0

    pl_series = df["pl_by_percentage"].apply(convert_value)  # Use shared utility function
    best_trade_value = pl_series.max() or 0.0
    worst_trade_value = pl_series.min() or 0.0
    return float(best_trade_value), float(worst_trade_value)


def max_drawdown(df: pd.DataFrame) -> float:
    df_check(df, ["pl_by_percentage"])
    if df["pl_by_percentage"].empty:
        return 0.0

    pl_series = df["pl_by_percentage"].apply(convert_value)  # Use shared utility function
    peak = pl_series.cummax()
    dd = (peak - pl_series) / peak.where(peak != 0, np.nan)
    max_dd = dd.max() if not dd.empty else 0.0
    return max_dd


def expectency(df: pd.DataFrame) -> float:
    df_check(df, ["outcome"])
    if df["outcome"].empty:
        return 0.0

    wins = (df["outcome"] == "WIN").sum()
    losses = (df["outcome"] == "LOSS").sum()
    wr = (wins / (wins + losses)) if (wins + losses) > 0 else 0.0
    lr = 1 - wr
    avg_w = avg_wl(df)[0]
    avg_l = avg_wl(df)[1]

    # Expectancy = (Win Rate * Avg Win) - (Loss Rate * Avg Loss), where Avg Loss is positive
    expectency = (wr * avg_w) - (lr * avg_l)
    return expectency


def durations(df: pd.DataFrame) -> tuple[float, float]:
    if (
        df is None
        or df.empty
        or "entry_time" not in df
        or "exit_time" not in df
        or df["entry_time"].empty
        or df["exit_time"].empty
    ):
        return 0.0, 0.0

    try:
        # Specify the expected format to avoid warnings
        df["entry_time"] = pd.to_datetime(df["entry_time"], format="%H:%M:%S", errors="coerce")
        df["exit_time"] = pd.to_datetime(df["exit_time"], format="%H:%M:%S", errors="coerce")
    except ValueError:
        return 0.0, 0.0

    # Check if all values are NaT (i.e., conversion failed for all rows)
    if df["entry_time"].isna().all() or df["exit_time"].isna().all():
        return 0.0, 0.0

    df["duration_minutes"] = (df["exit_time"] - df["entry_time"]).dt.total_seconds() / 60

    # Filter only the rows where 'outcome' is "WIN" and 'duration_minutes' > 0
    only_wins = df[(df["duration_minutes"] > 0) & (df["outcome"] == "WIN")]["duration_minutes"]
    min_duration = only_wins.min() if not only_wins.empty else 0.0
    max_duration = df["duration_minutes"].max() if not df["duration_minutes"].empty else 0.0

    return float(min_duration), float(max_duration)


def stats_table(df: pd.DataFrame) -> dict:
    """
    Returns a dictionary of statistics.
    """
    if df is None or df.empty:
        print("Warning: No data to process for statistics.")

    # Calculate metrics using the helper functions
    total_trades = len(df)
    pl_values = pl_raw(df)
    total_pl = pl_values.sum()

    wr_no_be, wr_with_be = winrate(df)
    wins_count = wining_trades(df)
    losses_count = lossing_trades(df)
    be_count = breakevens_trades(df)
    expectancy_value = expectency(df)
    avg_w, avg_l = avg_wl(df)
    avg_r = avg_risk(df)
    avg_rr_value = avg_rr(df)
    best_trade = best_worst_trade(df)[0]
    worst_trade = best_worst_trade(df)[1]
    max_dd_value = max_drawdown(df)
    min_duration_val, max_duration_val = durations(df)

    stats = {
        "Total Trades": total_trades,
        "Total P/L": f"{total_pl * 100:.2f}%",
        "Win-Rate (No BE)": f"{wr_no_be * 100:.2f}%",
        "Win-Rate (With BE)": f"{wr_with_be * 100:.2f}%",
        "Wining Trades": f"{wins_count:.0f}",
        "Lossing Trades": f"{losses_count:.0f}",
        "Breakeven Trades": f"{be_count:.0f}",
        "Expectency": f"{expectancy_value * 100:.2f}%",
        "Avg Win": f"{avg_w * 100:.2f}%",
        "Avg Loss": f"{avg_l * 100:.2f}%",
        "Avg Risk": f"{avg_r * 100:.2f}%",
        "Avg R/R": f"{avg_rr_value:.2f}",
        "Best Trade": f"{best_trade * 100:.2f}%",
        "Worst Trade": f"{worst_trade * 100:.2f}%",
        "Max Drawdown": f"{max_dd_value * 100:.2f}%",
        "Min Trade duration": f"{min_duration_val:.0f} Minutes",
        "Max Trade duration": f"{max_duration_val:.0f} Minutes",
    }
    return stats


def term_stats(stats: dict) -> None:
    """
    Prints the trading statistics from a dictionary to the terminal.
    """
    if not stats:
        print("No statistics available to display.")
        return

    print("\n--- Trading Statistics ---")
    for key, value in stats.items():
        print(f"{key:<20}: {value}")  # Use f-string formatting for alignment
    print("-------------------------\n")
    return

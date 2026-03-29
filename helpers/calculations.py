import numpy as np
import pandas as pd
from datetime import datetime, time

from config import DAY_ORDER
from helpers.utils import has_non_empty, series_or_none, weekly_day_labels


def winrate(
    outcomes: pd.Series, win_str: str = "WIN", loss_str: str = "LOSS"
) -> tuple[float, float]:
    """
    Returns:
        wr = winrate without BE's
        wr_with_be = winrate witt BE's
    """
    if outcomes.empty:
        return 0.0, 0.0
    wins = (outcomes == win_str).sum()
    losses = (outcomes == loss_str).sum()

    wr = (wins / (wins + losses)) if (wins + losses) > 0 else 0.0
    wr_with_be = (wins / len(outcomes)) if (wins + losses) > 0 else 0.0
    return wr, wr_with_be


def winning_trades(
    df: pd.DataFrame, outcome_col: str = "outcome", win_str: str = "WIN"
) -> int:
    if df.empty or outcome_col not in df.columns:
        return 0
    outcomes = df[outcome_col]
    wins = (outcomes == win_str).sum()
    return wins


def breakeven_trades(
    df: pd.DataFrame, outcome_col: str = "outcome", breakeven_str: str = "BE"
) -> int:
    if df.empty or outcome_col not in df.columns:
        return 0
    outcomes = df[outcome_col]
    breakevens = (outcomes == breakeven_str).sum()
    return breakevens


def losing_trades(
    df: pd.DataFrame, outcome_col: str = "outcome", loss_str: str = "LOSS"
) -> int:
    if df.empty or outcome_col not in df.columns:
        return 0
    outcomes = df[outcome_col]
    losses = (outcomes == loss_str).sum()
    return losses


def profit_factor(trade_results: pd.Series) -> float:
    """
    Calculate the profit factor from a pandas Series of trade results (R/R).

    Args:
        trade_results (pd.Series): Series of trade PnLs, R/R (positive for wins, negative for losses).

    Returns:
        float: Profit factor (gross profit / gross loss). Returns float('inf') if no losses.
    """
    wins = trade_results[trade_results > 0]
    losses = trade_results[trade_results < 0]
    total_profit = wins.sum()
    total_loss = abs(losses.sum())

    if total_loss == 0:
        return float("inf")  # Avoid division by zero

    return total_profit / total_loss


def avg_metrics(
    risk_series: pd.Series = pd.Series(),
    rr_series: pd.Series = pd.Series(),
) -> tuple[int, float]:
    """
    Calculate the average number of contracts per trade (rounded) and average risk-reward ratio.
    Returns:
        tuple: (avg_contracts, avg_rr)
            - avg_contracts (int): Rounded average number of contracts per trade.
            - avg_rr (float): Average risk-reward ratio (rounded to 2 decimals).
    """
    # Average number of contracts (must be whole number)
    avg_contracts = round(risk_series.mean(), 0) if not risk_series.empty else 0

    # Average risk-reward ratio (float)
    avg_rr = round(rr_series.mean(), 2) if not rr_series.empty else 0.0

    return avg_contracts, avg_rr


def best_worst_trade(pl_series: pd.Series) -> tuple[float, float]:
    best_trade_value = pl_series.max() or 0.0
    worst_trade_value = pl_series.min() or 0.0
    return float(best_trade_value), float(worst_trade_value)


def max_drawdown_from_pct_returns(
    perTrade_returns=None, cumulative_returns=None
) -> float:
    """
    Calculate max drawdown from a series of percentage returns or cumulative percentage returns.

    Parameters:
    - perTrade_returns (list or pd.Series): Raw percentage returns per period (e.g., 0.01 = 1%).
    - cumulative_returns (list or pd.Series): Cumulative percentage returns (e.g., 0.0299 = 2.99%).

    Returns:
    - float: Max drawdown as a positive decimal (e.g., 0.05 for 5%).

    Raises:
    - ValueError: If both or neither inputs are provided, or if any peak value is -100% (causing division-by-zero).
    """
    if (perTrade_returns is None and cumulative_returns is None) or (
        perTrade_returns is not None and cumulative_returns is not None
    ):
        raise ValueError(
            "Provide exactly one of perTrade_returns or cumulative_returns"
        )
    if perTrade_returns is not None:
        if not isinstance(perTrade_returns, pd.Series):
            perTrade_returns = pd.Series(perTrade_returns)
        returns_curve = (1 + perTrade_returns).cumprod() - 1  # right way to compounds
    else:
        if not isinstance(cumulative_returns, pd.Series):
            cumulative_returns = pd.Series(cumulative_returns)
        returns_curve = cumulative_returns

    peak = returns_curve.cummax()
    # Check for division-by-zero (1 + peak == 0)
    if (1 + peak).eq(0).any():
        raise ValueError("Cannot compute drawdown: peak value of -100% detected")

    drawdown = (returns_curve - peak) / (1 + peak)
    return -drawdown.min()  # make it positive dd value


def max_drawdown_from_equity(equity_balances=None) -> float:
    """
    Calculate max drawdown from a series of equity balances.

    Parameters:
    - equity_balances (list or pd.Series): Series of portfolio values (e.g., [1000, 1020, 980, ...]).

    Returns:
    - float: Max drawdown as a positive decimal (e.g., 0.05 for 5%).

    Raises:
    - ValueError: If equity_balances is None, empty, or contains zero/negative values.
    """
    if equity_balances is None or (
        isinstance(equity_balances, (list, pd.Series)) and len(equity_balances) == 0
    ):
        raise ValueError("equity_balances must be provided and non-empty")

    if not isinstance(equity_balances, pd.Series):
        equity_balances = pd.Series(equity_balances)

    # Check for zero or negative balances
    if (equity_balances <= 0).any():
        raise ValueError("equity_balances cannot contain zero or negative values")

    peak = equity_balances.cummax()
    drawdown = (equity_balances - peak) / peak
    return -drawdown.min()


def expectancy_from_rr(outcomes: pd.Series, rr_series: pd.Series) -> float:
    """
    Calculate trading expectancy.

    Args:
        outcomes (pd.Series): Series with "WIN", "LOSS" (ignore "BE")
        rr_series (pd.Series): Series of R-multiples

    Returns:
        float: Expectancy per trade in R-multiples
    """
    if rr_series.empty or outcomes.empty or len(outcomes) != len(rr_series):
        return 0.0

    # filter outcomes to execlude BE
    mask = outcomes.isin(["WIN", "LOSS"])  # bolean series
    filtered_outcomes = outcomes[mask]  # filtered no BE

    total_trades = len(filtered_outcomes)
    if total_trades == 0:
        return 0.0

    # Win/Loss rates purely from outcomes
    wr = (filtered_outcomes == "WIN").sum() / total_trades
    lr = (filtered_outcomes == "LOSS").sum() / total_trades

    # Avg win/loss purely from rr_series
    avg_win = rr_series[rr_series > 0].mean() if (rr_series > 0).any() else 0
    avg_loss = abs(rr_series[rr_series < 0].mean()) if (rr_series < 0).any() else 0

    expectancy = (wr * avg_win) - (lr * avg_loss)
    return round(expectancy, 2)


def consecutive_wins_and_losses(
    outcome: pd.Series, loss_str: str, win_str: str
) -> tuple[int, int]:
    """
    Calculate the maximum number of consecutive wins and losses in a series of trade outcomes.

    Args:
        outcome (pd.Series): A pandas Series containing trade outcomes (e.g., 'WIN', 'LOSS').
        loss_str (str): The string value representing a loss (e.g., 'LOSS', 'loss', 'L').
        win_str (str): The string value representing a win (e.g., 'WIN', 'win', 'W').

    Returns:
        Tuple[int, int]: A tuple containing (max_consecutive_losses, max_consecutive_wins).

    Raises:
        ValueError: If loss_str and win_str are identical or if either is empty.
        TypeError: If outcome is not a pandas Series.

    Notes:
        - The comparison is case-sensitive. For case-insensitive comparison, pass
          outcome.str.lower(), loss_str.lower(), and win_str.lower().
        - Returns (0, 0) if the series is empty.
        - Non-matching values (neither win_str nor loss_str) reset both streaks.
    """
    # Input validation
    if not isinstance(outcome, pd.Series):
        raise TypeError("outcome must be a pandas Series")
    if not loss_str or not win_str:
        raise ValueError("loss_str and win_str cannot be empty")
    if loss_str == win_str:
        raise ValueError("loss_str and win_str must be different")
    if outcome.empty:
        return (0, 0)

    max_loss_streak = 0
    max_win_streak = 0
    current_loss_streak = 0
    current_win_streak = 0

    for value in outcome:
        if value == loss_str:
            current_loss_streak += 1
            current_win_streak = 0
            max_loss_streak = max(max_loss_streak, current_loss_streak)
        elif value == win_str:
            current_win_streak += 1
            current_loss_streak = 0
            max_win_streak = max(max_win_streak, current_win_streak)
        else:
            current_loss_streak = 0
            current_win_streak = 0

    return (max_loss_streak, max_win_streak)




def daily_rr_summary(rr_series: pd.Series, day_series: pd.Series) -> pd.Series:
    """Aggregate total R by weekday."""
    valid_mask = rr_series.notna() & day_series.notna()
    rr_series = rr_series[valid_mask]
    day_series = day_series[valid_mask]
    if rr_series.empty or day_series.empty:
        return pd.Series(dtype=float)

    return rr_series.groupby(day_series).sum().reindex(
        [day for day in DAY_ORDER if day in day_series.values]
    ).dropna()


def max_drawdown_r(rr_series: pd.Series) -> float:
    """Calculate max drawdown from cumulative R as a positive R value."""
    rr_series = rr_series.dropna()
    if rr_series.empty:
        return 0.0

    cumulative_rr = rr_series.cumsum()
    drawdown = cumulative_rr - cumulative_rr.cummax()
    return abs(float(drawdown.min()))


def stats_table_weekly(df: pd.DataFrame) -> dict:
    """Calculate summary statistics for the weekly report."""
    stats: dict[str, str | int] = {"Total Trades": len(df)}
    rr_series = series_or_none(df, "rr")
    outcomes = df["outcome"].astype(str).str.strip() if "outcome" in df.columns else None
    day_series = weekly_day_labels(df)

    if rr_series is not None and not rr_series.empty:
        stats["Total R/R"] = f"{rr_series.sum():.2f}"

        if day_series is not None:
            daily_rr = daily_rr_summary(rr_series, day_series)
            if not daily_rr.empty:
                stats["Best Day"] = f"{daily_rr.idxmax().title()} ({daily_rr.max():.2f}R)"
                stats["Worst Day"] = f"{daily_rr.idxmin().title()} ({daily_rr.min():.2f}R)"

    if has_non_empty(df, "trade_date"):
        valid_dates = pd.to_datetime(df["trade_date"], errors="coerce").dropna()
        if not valid_dates.empty:
            stats["Week Range"] = (
                f"{valid_dates.min().strftime('%Y-%m-%d')} to "
                f"{valid_dates.max().strftime('%Y-%m-%d')}"
            )

    if outcomes is not None and not outcomes.empty:
        stats["Winning Trades"] = winning_trades(df, outcome_col="outcome", win_str="WIN")
        stats["Losing Trades"] = losing_trades(df, outcome_col="outcome", loss_str="LOSS")
        stats["Breakeven Trades"] = breakeven_trades(df, outcome_col="outcome", breakeven_str="BE")

    return stats


def stats_table_overall(df: pd.DataFrame) -> dict:
    """Calculate summary statistics for the overall report."""
    stats: dict[str, str | int] = {"Total Trades": len(df)}
    rr_series = series_or_none(df, "rr")
    position_size = series_or_none(df, "position_size")
    outcomes = df["outcome"].astype(str).str.strip() if "outcome" in df.columns else None

    if rr_series is not None and not rr_series.empty:
        total_rr = rr_series.sum()
        profit_factor_value = profit_factor(rr_series)
        best_trade, _ = best_worst_trade(rr_series)
        stats["Total R/R"] = f"{total_rr:.2f}"
        stats["Profit Factor"] = f"{profit_factor_value:.2f}"
        stats["Max Drawdown"] = f"{max_drawdown_r(rr_series):.2f}R"
        stats["Best Trade"] = f"{best_trade:.2f}R"

    if outcomes is not None and not outcomes.empty:
        wr_no_be, _ = winrate(outcomes)
        stats["WinRate"] = f"{wr_no_be * 100:.2f}%"
        stats["Winning Trades"] = winning_trades(df, outcome_col="outcome", win_str="WIN")
        stats["Losing Trades"] = losing_trades(df, outcome_col="outcome", loss_str="LOSS")
        stats["Breakeven Trades"] = breakeven_trades(df, outcome_col="outcome", breakeven_str="BE")
        cons_losses, cons_wins = consecutive_wins_and_losses(outcomes, "LOSS", "WIN")
        stats["Consecutive Losses"] = cons_losses
        stats["Consecutive Wins"] = cons_wins

    if position_size is not None and rr_series is not None and not rr_series.empty:
        avg_risk, avg_rr = avg_metrics(position_size, rr_series)
        stats["Avg R/R"] = f"{avg_rr:.2f}"
        stats["Avg Position Size"] = f"{avg_risk:.0f}"

    if outcomes is not None and rr_series is not None and not rr_series.empty:
        stats["Expectancy"] = f"{expectancy_from_rr(outcomes, rr_series):.2f}"

    if has_non_empty(df, "asset"):
        stats["Assets Traded"] = df["asset"].dropna().nunique()

    return stats

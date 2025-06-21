import numpy as np
import pandas as pd


def winrate(
    outcomes: pd.Series, win_str: str = "WIN", loss_str: str = "LOSS"
) -> tuple[float, float]:
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
    risk_series: pd.Series = pd.Series(dtype=int),
    rr_series: pd.Series = pd.Series(dtype=float),
) -> tuple[int, float]:
    """
    Calculate the average number of contracts per trade (rounded) and average risk-reward ratio.

    Args:
        risk_series (pd.Series): Series of contract counts per trade.
        rr_series (pd.Series): Series of risk-reward ratios.

    Returns:
        tuple: (avg_contracts, avg_rr)
            - avg_contracts (int): Rounded average number of contracts per trade.
            - avg_rr (float): Average risk-reward ratio (rounded to 2 decimals).
    """
    # Average number of contracts (must be whole number)
    avg_contracts = round(risk_series.mean()) if not risk_series.empty else 0

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


def expectancy_by_rr(rr_series: pd.Series, wins: int, losses: int) -> float:
    """
    Calculate trading expectancy based on win/loss count and RR (risk-reward) series.

    Args:
        rr_series (pd.Series): Series of risk-reward ratios for winning trades (should be > 0).
        wins (int): Number of winning trades.
        losses (int): Number of losing trades.

    Returns:
        float: Expectancy per trade in R-multiples.

    Notes:
        - Assumes average loss = 1R.
        - If RR series is empty or total trades = 0, returns 0.0.
        - Only positive RR values are used to calculate avg win.
    """
    total_trades = wins + losses
    if total_trades == 0 or rr_series.empty:
        return 0.0
    # Win rate and loss rate
    wr = wins / total_trades
    lr = 1 - wr

    # Filter RR values to only positive ones for avg win
    positive_rr = rr_series[rr_series > 0]
    avg_win = positive_rr.mean() if not positive_rr.empty else 0.0
    # Assume average loss = 1R
    avg_loss = 1

    # Expectancy formula
    expectancy = (wr * avg_win) - (lr * avg_loss)
    return round(expectancy, 2)


def durations(df: pd.DataFrame, start: pd.Series, end: pd.Series):
    """Get the min and the max trades durations"""
    try:
        # Specify the expected format to avoid warnings
        start = pd.to_datetime(start, format="%H:%M:%S", errors="coerce")
        end = pd.to_datetime(end, format="%H:%M:%S", errors="coerce")
    except ValueError:
        return 0.0, 0.0

    start = pd.to_datetime(start, errors="coerce")
    end = pd.to_datetime(end, errors="coerce")

    # Check if all values are NaT (i.e., conversion failed for all rows)
    if start.isna().all() or end.isna().all():
        return 0.0, 0.0

    df["minutes"] = (end - start).dt.total_seconds() / 60

    # Filter only the rows where 'outcome' is "WIN" and 'minutes' > 0
    only_wins = df[(df["minutes"] > 0) & (df["outcome"] == "WIN")]["minutes"]
    min = only_wins.min() if not only_wins.empty else 0.0
    max = only_wins.max() if not only_wins.empty else 0.0
    return min, max


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

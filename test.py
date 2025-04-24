import pandas as pd


def max_drawdown(df: pd.DataFrame) -> float:
    """
    Calculate the maximum drawdown of a series of periodic returns.

    Parameters:
    returns (pd.Series): Series of returns (e.g. 0.01 for +1%, -0.01 for -1%)

    Returns:
    float: The maximum drawdown (negative float, e.g. -0.05 for a 5% drawdown)
    """
    # 1) Build the wealth index
    wealth_index = (1 + df["pl_by_percentage"]).cumprod()
    # 2) Compute the running peak
    running_max = wealth_index.cummax()
    # 3) Compute drawdowns
    drawdown = (wealth_index - running_max) / running_max
    # 4) Return the worst (most negative) drawdown
    return drawdown.min()


url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQL7L-HMzezpuFCDOuS0wdUm81zbX4iVOokaFUGonVR1XkhS6CeDl1gHUrW4U0Le4zihfpqSDphTu4I/pub?gid=212787870&single=true&output=csv"
df = pd.read_csv(url)

print(max_drawdown(df))
# print(df["pl_by_percentage"].head(-1))

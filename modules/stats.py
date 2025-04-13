import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns


def create_stats_table(stats):
    # Create a figure with a table
    plt.style.use("dark_background")
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.axis("off")

    # Convert stats dictionary to a list of lists for the table
    table_data = [[k, v] for k, v in stats.items()]

    # Create the table
    table = ax.table(
        cellText=table_data, colLabels=["Statistic", "Value"], loc="center", cellLoc="center", colColours=["#111111", "#111111"]
    )

    # Style the table
    table.auto_set_font_size(False)
    table.set_fontsize(12)
    table.scale(1.2, 1.5)

    # Set background colors
    for (i, j), cell in table.get_celld().items():
        if i == 0:  # Header row
            cell.set_facecolor("#111111")
            cell.set_text_props(color="white", weight="bold")
        else:
            cell.set_facecolor("#111111")
            cell.set_text_props(color="white")

    plt.title("Trading Performance Summary", pad=20, color="white")
    plt.tight_layout()
    return fig


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

def total_profits(df: pd.DataFrame, total_p: float) -> float:
    converted_pl = (
        df["pl_by_percentage"].str.replace("%", "").astype(float)
        if df["pl_by_percentage"].dtype == "object"
        else df["pl_by_percentage"] * 100
    )
    total_p = converted_pl.cumsum()
    return total_p

def avg_win(df: pd.DataFrame, avg_win_value: float) -> float:


    # formula 
    # Average Win = Total Profit from Winning Trades / Number of Winning Trades
    return avg_win_value

def expectency(df: pd.DataFrame, expected_value: float) -> float:
    wins = df["outcome"].value_counts().get("WIN", 0)
    losses = df["outcome"].value_counts().get("LOSS", 0)
    winrate = (wins / (wins + losses)) * 100 if (wins + losses) > 0 else 0.0


    # formula
    # Expectancy = (Win Rate × Avg Win) - (Loss Rate × Avg Loss)

    return expected_value












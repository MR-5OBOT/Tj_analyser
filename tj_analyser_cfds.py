import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns


def cols_check(df):
    if (
        "date" not in df.columns
        or "symbol" not in df.columns
        or "entry_time" not in df.columns
        or "entry_exit" not in df.columns
        or "risk_by_percentage" not in df.columns
        or "outcome" not in df.columns
        or "p/l_by_pips" not in df.columns
        or "p/l_by_rr" not in df.columns
    ):
        print("Error: One or more required columns missing.")
        # quit()


def overall_stats(df):
    # Work on a copy to avoid modifying the original
    df_copy = df.copy()

    wins = df["outcome"].value_counts()[["WIN"]].values.item()  # Get the scalar value
    losses = df["outcome"].value_counts()[["LOSS"]].values.item()  # Get the scalar value
    winrate = float((wins / df.shape[0]) * 100)

    # Clean the data by removing % and converting to float
    pl_numeric = df["p/l_by_percentage"].str.replace("%", "").astype(float)

    # Average Win (mean of positive values)
    avg_win_percentage = pl_numeric[pl_numeric > 0].mean()
    # Average Loss (mean of negative values)
    avg_loss_percentage = pl_numeric[pl_numeric < 0].mean()

    total_pl = pl_numeric.sum()
    total_trades = df.shape[0]  # Gets the number of rows as an integer

    # max dd
    df_copy["peak"] = pl_numeric.cummax()  # Running max balance
    df_copy["drawdown"] = (df_copy["peak"] - pl_numeric) / df_copy["peak"]  # Drawdown fraction
    max_dd_percent = df_copy["drawdown"].max() * 100  # Max drawdown in %

    best_trade = pl_numeric.max()
    worst_trade = pl_numeric.min()
    # Avg risk
    df_copy["risk_converted"] = df["risk_by_percentage"].str.replace("%", "").astype(float)
    avg_risk = df_copy["risk_converted"].mean()
    # avg rr
    avg_rr = df["p/l_by_rr"].mean()

    print()
    print("Overall stats: ")
    print(f"Total Trades : {total_trades}")
    print(f"Win-Rate : {winrate:.2f}%")
    print(f"Total P/L : {total_pl:.2f}%")
    print(f"Average Win Percentage: {avg_win_percentage:.2f}%")
    print(f"Average Loss Percentage: {avg_loss_percentage:.2f}%")
    print(f"Avg Risk: {avg_risk:.2f}%")
    print(f"Avg R/R: {avg_rr:.2f}")
    print(f"Best trade: ${best_trade:.2f}")
    print(f"Worst trade: ${worst_trade:.2f}")
    print(f"Max Drawdown: {max_dd_percent:.2f}%")
    # df["drawdown"] = df["drawdown"].map("{:.4f}".format)  # for clean columns
    return winrate, max_dd_percent, avg_win_percentage, avg_loss_percentage, total_trades, best_trade, worst_trade


def day_of_week_stats(df, position=1):
    """
    Compute win statistics by day of the week and insert 'DoW' column at the specified position.
    Returns:
    - Tuple of win counts for Monday through Friday
    """
    # Work on a copy to avoid modifying the original
    df_copy = df.copy()

    # Convert the 'date' column to datetime
    df_copy["date"] = pd.to_datetime(df_copy["date"])

    if "DoW" not in df.columns:
        # Extract day of week and convert to lowercase
        dow_series = df_copy["date"].dt.day_name().str.lower()
        # Ensure position is valid
        dow_position = max(0, min(position, len(df_copy.columns)))
        # Insert 'DoW' at the specified position
        df_copy.insert(dow_position, "DoW", dow_series)
    else:
        dow_series = df_copy["DoW"].str.lower()
        df_copy = df_copy.drop(columns="DoW")  # Remove 'DoW' from its current position
        df_copy.insert(position, "DoW", dow_series)  # Insert at the specified position

    # Now that 'DoW' is set up, compute win stats for each day
    monday_wins = len(df_copy[(df_copy["outcome"] == "WIN") & (df_copy["DoW"] == "monday")])
    tuesday_wins = len(df_copy[(df_copy["outcome"] == "WIN") & (df_copy["DoW"] == "tuesday")])
    wednesday_wins = len(df_copy[(df_copy["outcome"] == "WIN") & (df_copy["DoW"] == "wednesday")])
    thursday_wins = len(df_copy[(df_copy["outcome"] == "WIN") & (df_copy["DoW"] == "thursday")])
    friday_wins = len(df_copy[(df_copy["outcome"] == "WIN") & (df_copy["DoW"] == "friday")])

    # Print the stats
    print("\nStats by day of week:")
    print(f"Total Monday wins: {monday_wins}")
    print(f"Total Tuesday wins: {tuesday_wins}")
    print(f"Total Wednesday wins: {wednesday_wins}")
    print(f"Total Thursday wins: {thursday_wins}")
    print(f"Total Friday wins: {friday_wins}")

    return df_copy


def hour_of_day_stats(df):
    # Work on a copy to avoid modifying the original
    df_copy = df.copy()

    # Convert entry_time to datetime.time objects if it's a string
    df_copy["entry_time"] = pd.to_datetime(df_copy["entry_time"], format="%H:%M:%S").dt.time

    # Convert datetime.time to Timedelta
    def time_to_timedelta(time_obj):
        try:
            return pd.Timedelta(hours=time_obj.hour, minutes=time_obj.minute, seconds=time_obj.second)
        except AttributeError:
            return pd.Timedelta(0)  # Default for invalid times

    # Apply the conversion to the entry_time column
    df_copy["entry_time_td"] = df_copy["entry_time"].apply(time_to_timedelta)

    # Hour boundaries
    h08 = pd.to_timedelta("08:00:00")
    h09 = pd.to_timedelta("09:00:00")
    h10 = pd.to_timedelta("10:00:00")
    h11 = pd.to_timedelta("11:00:00")
    h12 = pd.to_timedelta("12:00:00")

    # Wins per hour (use df_copy for entry_time_td)
    hour_08_wins = len(df_copy[(df_copy["entry_time_td"] >= h08) & (df_copy["entry_time_td"] < h09) & (df_copy["outcome"] == "WIN")])
    hour_09_wins = len(df_copy[(df_copy["entry_time_td"] >= h09) & (df_copy["entry_time_td"] < h10) & (df_copy["outcome"] == "WIN")])
    hour_10_wins = len(df_copy[(df_copy["entry_time_td"] >= h10) & (df_copy["entry_time_td"] < h11) & (df_copy["outcome"] == "WIN")])
    hour_11_wins = len(df_copy[(df_copy["entry_time_td"] >= h11) & (df_copy["entry_time_td"] < h12) & (df_copy["outcome"] == "WIN")])

    # Losses per hour
    hour_08_losses = len(df_copy[(df_copy["entry_time_td"] >= h08) & (df_copy["entry_time_td"] < h09) & (df_copy["outcome"] == "LOSS")])
    hour_09_losses = len(df_copy[(df_copy["entry_time_td"] >= h09) & (df_copy["entry_time_td"] < h10) & (df_copy["outcome"] == "LOSS")])
    hour_10_losses = len(df_copy[(df_copy["entry_time_td"] >= h10) & (df_copy["entry_time_td"] < h11) & (df_copy["outcome"] == "LOSS")])
    hour_11_losses = len(df_copy[(df_copy["entry_time_td"] >= h11) & (df_copy["entry_time_td"] < h12) & (df_copy["outcome"] == "LOSS")])

    # Best profit/loss by hour
    max_08 = df_copy[(df_copy["entry_time_td"] >= h08) & (df_copy["entry_time_td"] < h09)]["p/l_by_percentage"].max()
    max_09 = df_copy[(df_copy["entry_time_td"] >= h09) & (df_copy["entry_time_td"] < h10)]["p/l_by_percentage"].max()
    max_10 = df_copy[(df_copy["entry_time_td"] >= h10) & (df_copy["entry_time_td"] < h11)]["p/l_by_percentage"].max()
    max_11 = df_copy[(df_copy["entry_time_td"] >= h11) & (df_copy["entry_time_td"] < h12)]["p/l_by_percentage"].max()

    # Get best hour by p/l
    pl_numeric = df["p/l_by_percentage"].str.replace("%", "").astype(float)
    df_copy["hour"] = df_copy["entry_time_td"].dt.components["hours"].fillna(0).astype(int)
    max_by_hour = pl_numeric.groupby(df_copy["hour"]).max()
    best_hour = max_by_hour.idxmax() if not max_by_hour.isna().all() else None
    best_profit = max_by_hour.max() if not max_by_hour.isna().all() else None

    # Print stats
    print()
    print("Stats by hour of day:")
    if best_hour is not None:
        print(f"Best Trading Hour is [{best_hour}:00] with {best_profit:.2f}%")
    else:
        print("No trades found.")

    print(f"[08:00] - Wins: {hour_08_wins}, Losses: {hour_08_losses}")
    print(f"[09:00] - Wins: {hour_09_wins}, Losses: {hour_09_losses}")
    print(f"[10:00] - Wins: {hour_10_wins}, Losses: {hour_10_losses}")
    print(f"[11:00] - Wins: {hour_11_wins}, Losses: {hour_11_losses}")

    return (h08, h09, h10, h11), df_copy


# data visualizations
def visualizations_setup():
    plt.style.use("dark_background")
    plt.figure(figsize=(6, 6))
    return 0


# balance history graph
def pl_percentage_plot(df):
    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%d-%m-%y")

    risk_converted = df["risk_by_percentage"].str.replace("%", "").astype(float)
    pl_numeric = risk_converted * df["p/l_by_rr"]  # risk * rr
    df["p/l_by_percentage"] = pl_numeric  # creat the column
    # add % to the col data if it's allready converted
    df["p/l_by_percentage"] = df["p/l_by_percentage"].apply(lambda x: f"{x:.2f}%")

    x = df["date"]
    y = pl_numeric.cumsum()
    # Plot setup
    visualizations_setup()
    plt.plot(x, y, label="P/L by %")
    plt.title("Performance By Percentage Gains")
    # plt.xlabel("Date")
    plt.ylabel("P/L by %")
    plt.xticks(df["date"][::5], rotation=45, ha="right") # [::5] dates evry 5 days for better visualizations
    plt.legend()
    # plt.grid(True, linestyle="--", alpha=0.7)
    # plt.tight_layout()
    plt.savefig("cumulative_gains_by_percentage.png")
    plt.show()
    return df

def pl_by_symbol_rr(df):
    symbols = df["symbol"].value_counts()
    x = symbols.index
    height = symbols.values
    print(symbols)
    print()
    print(x)
    print()
    print(height)

    # Plot setup
    visualizations_setup()
    # x = df.groupby("symbol")["p/l_by_rr"].sum().index
    plt.bar(x, height=height, label="P/L by symbol")
    plt.title("Performance By Percentage Gains")
    # plt.xlabel("Symbols")
    plt.ylabel("R/R")
    plt.xticks(rotation=45, ha="right")
    plt.legend()
    # plt.grid(True, linestyle="--", alpha=0.7)
    # plt.tight_layout()
    plt.savefig("pl_by_symbol_rr.png")
    plt.show()
    return df

if __name__ == "__main__":
    # df = pd.read_excel(file_path)
    file_path = "./data/tj_cdfs_tpl.csv"
    df = pd.read_csv(file_path)
    # cols_check(df)
    overall_stats(df)
    # hour_of_day_stats(df)
    # df = day_of_week_stats(df)  # Assign the returned df_copy back to df
    # pl_percentage_plot(df)
    # pl_by_symbol_rr(df)
    df.to_csv("output_data.csv", index=False)
    print("DataFrame saved to 'output_data.csv'")

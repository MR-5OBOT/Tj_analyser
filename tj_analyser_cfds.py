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
    if "date" not in df.columns or "p/l_by_percentage" not in df.columns or "p/l_by_rr" not in df.columns or "outcome" not in df.columns:
        raise ValueError("Column 'date, outcome, p/l_by_percentage, p/l_by_rr' not found in DataFrame")

    df_copy = df.copy()

    wins = df["outcome"].value_counts()[["WIN"]].values.item()  # Get the scalar value
    losses = df["outcome"].value_counts()[["LOSS"]].values.item()  # Get the scalar value
    # be = df["outcome"].value_counts()[["BE"]].values.item()  # Get the scalar value
    winrate = float((wins / (wins + losses)) * 100)

    total_trades = df.shape[0]  # Gets the number of rows as an integer
    pl_numeric = df["p/l_by_percentage"].str.replace("%", "").astype(float)
    total_pl = pl_numeric.sum()

    # Average Win (mean of positive values)
    avg_win_percentage = pl_numeric[pl_numeric > 0].mean()
    # Average Loss (mean of negative values)
    avg_loss_percentage = pl_numeric[pl_numeric < 0].mean()
    # Avg risk
    df_copy["risk_converted"] = df["risk_by_percentage"].str.replace("%", "").astype(float)
    avg_risk = df_copy["risk_converted"].mean()
    # avg rr
    avg_rr = df["p/l_by_rr"].mean()

    best_trade = pl_numeric.max()
    worst_trade = pl_numeric.min()
    # max dd
    df_copy["peak"] = pl_numeric.cummax()  # Running max balance
    df_copy["drawdown"] = (df_copy["peak"] - pl_numeric) / df_copy["peak"]  # Drawdown fraction
    max_dd_percent = df_copy["drawdown"].max()  # Max drawdown in %

    print()
    print("--- Overall stats: --- ")
    print(f"Total Trades : {total_trades}")
    print(f"Win-Rate : {winrate:.2f}%")
    print(f"Total P/L : {total_pl:.2f}%")
    print(f"Average Win Percentage: {avg_win_percentage:.2f}%")
    print(f"Average Loss Percentage: {avg_loss_percentage:.2f}%")
    print(f"Avg Risk: {avg_risk:.2f}%")
    print(f"Avg R/R: {avg_rr:.2f}")
    print(f"Best trade: {best_trade:.2f}%")
    print(f"Worst trade: {worst_trade:.2f}%")
    print(f"Max Drawdown: {max_dd_percent:.2f}%")
    # df["drawdown"] = df["drawdown"].map("{:.4f}".format)  # for clean columns
    return winrate, max_dd_percent, avg_win_percentage, avg_loss_percentage, total_trades, best_trade, worst_trade, pl_numeric


def day_of_week_stats(df, position=1):
    """
    Compute win statistics by day of the week and insert 'DoW' column at the specified position.
    Returns:
    - Tuple of win counts for Monday through Friday
    """
    if "date" not in df.columns or "outcome" not in df.columns:
        raise ValueError("Column 'date, outcome' not found in DataFrame")
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

    monday_losses = len(df_copy[(df_copy["outcome"] == "LOSS") & (df_copy["DoW"] == "monday")])
    tuesday_losses = len(df_copy[(df_copy["outcome"] == "LOSS") & (df_copy["DoW"] == "tuesday")])
    wednesday_losses = len(df_copy[(df_copy["outcome"] == "LOSS") & (df_copy["DoW"] == "wednesday")])
    thursday_losses = len(df_copy[(df_copy["outcome"] == "LOSS") & (df_copy["DoW"] == "thursday")])
    friday_losses = len(df_copy[(df_copy["outcome"] == "LOSS") & (df_copy["DoW"] == "friday")])

    # Print the stats
    print()
    print("--- Stats by day of week: ---")
    print(f"[Monday] wins: {monday_wins}, losses: {monday_losses}")
    print(f"[Tuesday] wins: {tuesday_wins}, losses: {tuesday_losses}")
    print(f"[Wednesday] wins: {wednesday_wins}, losses: {wednesday_losses}")
    print(f"[Thursday] wins: {thursday_wins}, losses: {thursday_losses}")
    print(f"[Friday] wins: {friday_wins}, losses: {friday_losses}")
    return df_copy


def hour_of_day_stats(df):
    if (
        "date" not in df.columns
        or "entry_time" not in df.columns
        or "entry_exit" not in df.columns
        or "outcome" not in df.columns
        or "p/l_by_rr" not in df.columns
    ):
        raise ValueError("Column 'symbol' not found in DataFrame")

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
    # max_08 = df_copy[(df_copy["entry_time_td"] >= h08) & (df_copy["entry_time_td"] < h09)]["p/l_by_percentage"].max()
    # max_09 = df_copy[(df_copy["entry_time_td"] >= h09) & (df_copy["entry_time_td"] < h10)]["p/l_by_percentage"].max()
    # max_10 = df_copy[(df_copy["entry_time_td"] >= h10) & (df_copy["entry_time_td"] < h11)]["p/l_by_percentage"].max()
    # max_11 = df_copy[(df_copy["entry_time_td"] >= h11) & (df_copy["entry_time_td"] < h12)]["p/l_by_percentage"].max()

    # Get best hour by p/l
    pl_numeric = df["p/l_by_percentage"].str.replace("%", "").astype(float)
    df_copy["hour"] = df_copy["entry_time_td"].dt.components["hours"].fillna(0).astype(int)
    max_by_hour = pl_numeric.groupby(df_copy["hour"]).max()
    best_hour = max_by_hour.idxmax() if not max_by_hour.isna().all() else None
    best_profit = max_by_hour.max() if not max_by_hour.isna().all() else None

    # Print stats
    print()
    print("--- Stats by hour of day: ---")
    print(f"[08:00] - Wins: {hour_08_wins}, Losses: {hour_08_losses}")
    print(f"[09:00] - Wins: {hour_09_wins}, Losses: {hour_09_losses}")
    print(f"[10:00] - Wins: {hour_10_wins}, Losses: {hour_10_losses}")
    print(f"[11:00] - Wins: {hour_11_wins}, Losses: {hour_11_losses}")
    if best_hour is not None:
        print(f"Best Trading Hour is [{best_hour}:00] with {best_profit:.2f}% profits")
    else:
        print("No trades found.")
    print()

    return (h08, h09, h10, h11), df_copy


# data visualizations --------------------------------------------------


# balance history graph
def pl_percentage_plot(df):
    if "date" not in df.columns or "risk_by_percentage" not in df.columns or "p/l_by_rr" not in df.columns:
        raise ValueError("Columns 'symbol, date, p/l_by_rr' not found in DataFrame")

    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%d-%m-%y")
    df_copy = df.copy()
    risk_converted = df_copy["risk_by_percentage"].str.replace("%", "").astype(float)
    pl_numeric = risk_converted * df["p/l_by_rr"]  # risk * rr
    x = df["date"].index
    y = pl_numeric.cumsum()

    # Plot setup
    plt.style.use("dark_background")
    plt.figure(figsize=(6, 6))
    ax = plt.gca()  # Get the current axis
    sns.lineplot(x=x, y=y, label="P/L by %")
    plt.title("Performance By Percentage Gains")
    plt.xlabel("Date")
    plt.ylabel("P/L by %")
    # plt.xticks(rotation=90)
    plt.legend()
    # plt.grid(True, linestyle="--", alpha=0.7)

    # Remove right and top spines
    ax.spines["right"].set_visible(False)
    ax.spines["top"].set_visible(False)

    plt.tight_layout()
    plt.savefig("./exported_data/gains_by_percentage.png")
    plt.show()


def pl_by_symbol_rr(df):
    if "symbol" not in df.columns:
        raise ValueError("Column 'symbol' not found in DataFrame")

    # symbols = df["symbol"].value_counts()
    # x = symbols.index
    # height = symbols.values
    dow = df["risk_by_percentage"].str.replace("%", "").astype(float)
    outcome = df["outcome"]

    # Plot setup
    plt.style.use("dark_background")
    plt.figure(figsize=(6, 6))
    # plt.bar(x, height=height, label="P/L by symbol")
    sns.barplot(x=dow, y=outcome, hue=df["outcome"])
    plt.title("Performance By Percentage Gains")
    # plt.xlabel("Symbols")
    # plt.ylabel("R/R")
    # plt.xticks(rotation=45, ha="right")
    # plt.legend()
    # plt.grid(True, linestyle="--", alpha=0.7)
    plt.tight_layout()
    plt.savefig("./exported_data/pl_by_symbol_rr.png")
    plt.show()


def pl_hist(df):
    df_copy = df.copy()
    if "p/l_by_percentage" not in df.columns:
        raise ValueError("Column 'p/l_by_percentage' not found in DataFrame")

    risks = df_copy["p/l_by_percentage"].str.replace("%", "").astype(float)
    # Plot setup
    plt.style.use("dark_background")
    plt.figure(figsize=(6, 6))
    sns.histplot(risks, bins=15, kde=True)
    plt.title("Distribution of P/L by %")
    # plt.xlabel("P/L by %")
    # plt.ylabel("Frequency")  # Fixed typo "Freauency" to "Frequency"
    # plt.legend()
    # plt.grid(True, linestyle="--", alpha=0.7)  # Uncomment if you want grid
    plt.tight_layout()
    plt.savefig("./exported_data/pl_distribution.png")
    plt.show()


def boxplot_DoW(df):
    if "p/l_by_percentage" not in df.columns:
        raise ValueError("Column 'p/l_by_percentage' not found in DataFrame")

    df_copy = df.copy()
    # Plot setup
    pl = df_copy["risk_by_percentage"].str.replace("%", "").astype(float)
    plt.style.use("dark_background")
    plt.figure(figsize=(10, 6))
    sns.boxplot(x=df["DoW"], y=pl, hue=df["outcome"])
    plt.title("Boxplot for DoW vs pl by %")
    plt.tight_layout()
    plt.savefig("./exported_data/boxplot_DoW_vs_PL.png")
    plt.show()
    return df


def risk_vs_reward_scatter(df):
    df_copy = df.copy()
    if "risk_by_percentage" not in df.columns or "p/l_by_percentage" not in df.columns:
        raise ValueError("Column 'risk_by_percentage' or 'p/l_by_percentage' not found in DataFrame")

    x = df_copy["risk_by_percentage"].str.replace("%", "").astype(float)
    y = df_copy["p/l_by_percentage"].str.replace("%", "").astype(float)

    # Plot setup
    plt.style.use("dark_background")
    plt.figure(figsize=(6, 6))
    sns.scatterplot(x=x, y=y, data=df, hue="outcome", palette="YlGnBu")
    plt.title("Risk vs Rewards")
    # plt.xlabel("Risk by Percentage")
    # plt.ylabel("P/L by Percentage")
    # plt.axvline(1.5, color='gray', linestyle='--', label='1.5% Threshold')
    plt.legend()
    # plt.grid(True, linestyle="--", alpha=0.7)
    plt.tight_layout()
    plt.savefig("./exported_data/risk_vs_reward.png")
    plt.show()


# def pl_by_time_heatmap(df):
#     """
#     visualizations about day of week and houres of day.
#     """
#     df_copy = df.copy()
#     if "date" not in df.columns or "p/l_by_percentage" not in df.columns:
#         raise ValueError("Column 'date' or 'p/l_by_percentage' not found in DataFrame")
#
#     x = df_copy["risk_by_percentage"].str.replace("%", "").astype(float)
#     y = df_copy["p/l_by_percentage"].str.replace("%", "").astype(float)
#
#     # Plot setup
#     plt.style.use("dark_background")
#     plt.figure(figsize=(10, 6))
#     sns.heatmap()
#     plt.title("Risk vs Rewards")
#     plt.xlabel("Risk by Percentage")
#     plt.ylabel("P/L by Percentage")
#     # plt.axvline(1.5, color='gray', linestyle='--', label='1.5% Threshold')
#     plt.legend()
#     # plt.grid(True, linestyle="--", alpha=0.7)
#     plt.tight_layout()
#     plt.savefig("./exported_data/risk_vs_reward.png")
#     # plt.show()


if __name__ == "__main__":
    # df = pd.read_excel(file_path)
    file_path = "./data/tj_cfds_tpl.csv"
    df = pd.read_csv(file_path)

    # df.pop("p/l_by_percentage")
    # risk_converted = df["risk_by_percentage"].str.replace("%", "").astype(float)
    # df["p/l_by_percentage"] = risk_converted * df["p/l_by_rr"]
    # df["p/l_by_percentage"] = df["p/l_by_percentage"].apply(lambda x: f"{x:.2f}%")

    cols_check(df)
    overall_stats(df)
    df = day_of_week_stats(df)  # Assign the returned df_copy back to df
    hour_of_day_stats(df)
    # pl_percentage_plot(df)
    # pl_by_symbol_rr(df)
    # pl_hist(df)
    # risk_vs_reward_scatter(df)
    boxplot_DoW(df)
    #
    df.to_csv("./exported_data/output_data.csv", index=False)
    print("--DataFrame saved to 'output_data.csv--'")

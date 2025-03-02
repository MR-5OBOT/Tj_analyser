import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

# matplotlib setup
plt.style.use("dark_background")
plt.figure(figsize=(6, 6))


def csv_reader(file_path):
    df = pd.read_csv(file_path)
    # df.info()
    # print(df.head())
    return df


def overall_stats(df):
    winrate = df["wins"].count() / (df["wins"].count() + df["losses"].count())
    total_pl_dollar = df["profit_loss"].sum()
    avg_win = df[df["profit_loss"] > 0]["profit_loss"].mean()
    avg_loss = df[df["profit_loss"] < 0]["profit_loss"].mean()
    # total_trades = df.shape[0]  # Gets the number of rows as an integer
    total_trades = df["date"].count()

    print()
    print("Overall stats: ")
    print(f"Total Trades : {total_trades}")
    print(f"Total P/L : ${total_pl_dollar:.2f}")
    print(f"Avg win : ${avg_win:.2f}")
    print(f"Avg loss : ${avg_loss:.2f}")

    return winrate, total_pl_dollar, avg_win, avg_loss, total_trades


def day_of_week_stats(df):
    # Convert the 'date' column to datetime if it isn’t already
    df["date"] = pd.to_datetime(df["date"])
    # Extract day name (e.g., "Friday")
    df["DoW"] = df["date"].dt.day_name()
    # Filter for days with wins
    # monday_wins = df[(df["wins"] > 0) & (df["DoW"] == "Monday")].shape[0] # other way
    monday_wins = len(df[(df["wins"] > 0) & (df["DoW"] == "Monday")])
    tuesday_wins = len(df[(df["wins"] > 0) & (df["DoW"] == "Tuesday")])
    wednesday_wins = len(df[(df["wins"] > 0) & (df["DoW"] == "Wednesday")])
    thursday_wins = len(df[(df["wins"] > 0) & (df["DoW"] == "Thursday")])
    friday_wins = len(df[(df["wins"] > 0) & (df["DoW"] == "Friday")])

    print()
    print("Stats by day of week:")
    print(f"Total Monday wins: {monday_wins}")
    print(f"Total Tuesday wins: {tuesday_wins}")
    print(f"Total Wednesday wins: {wednesday_wins}")
    print(f"Total Thuesday wins: {thursday_wins}")
    print(f"Total Friday wins: {friday_wins}")

    return monday_wins, tuesday_wins, wednesday_wins, thursday_wins, friday_wins


def hour_of_day_stats(df):
    df["entry_time"] = df["entry_time"] + ":00"
    df["entry_time_td"] = pd.to_timedelta(df["entry_time"])
    # Hour boundaries
    h08 = pd.to_timedelta("08:00:00")
    h09 = pd.to_timedelta("09:00:00")
    h10 = pd.to_timedelta("10:00:00")
    h11 = pd.to_timedelta("11:00:00")
    h12 = pd.to_timedelta("12:00:00")
    # Wins per hour
    hour_08_wins = len(df[(df["entry_time_td"] >= h08) & (df["entry_time_td"] < h09) & (df["wins"] > 0)])
    hour_09_wins = len(df[(df["entry_time_td"] >= h09) & (df["entry_time_td"] < h10) & (df["wins"] > 0)])
    hour_10_wins = len(df[(df["entry_time_td"] >= h10) & (df["entry_time_td"] < h11) & (df["wins"] > 0)])
    hour_11_wins = len(df[(df["entry_time_td"] >= h11) & (df["entry_time_td"] < h12) & (df["wins"] > 0)])
    # Losses per hour
    hour_08_losses = len(df[(df["entry_time_td"] >= h08) & (df["entry_time_td"] < h09) & (df["losses"] > 0)])
    hour_09_losses = len(df[(df["entry_time_td"] >= h09) & (df["entry_time_td"] < h10) & (df["losses"] > 0)])
    hour_10_losses = len(df[(df["entry_time_td"] >= h10) & (df["entry_time_td"] < h11) & (df["losses"] > 0)])
    hour_11_losses = len(df[(df["entry_time_td"] >= h11) & (df["entry_time_td"] < h12) & (df["losses"] > 0)])
    # Best profit_los by hour
    max_08 = df[(df["entry_time_td"] >= h08) & (df["entry_time_td"] < h09)]["profit_loss"].max()
    max_09 = df[(df["entry_time_td"] >= h09) & (df["entry_time_td"] < h10)]["profit_loss"].max()
    max_10 = df[(df["entry_time_td"] >= h10) & (df["entry_time_td"] < h11)]["profit_loss"].max()
    max_11 = df[(df["entry_time_td"] >= h11) & (df["entry_time_td"] < h12)]["profit_loss"].max()

    # get best hour by p/l
    df["hour"] = df["entry_time_td"].dt.components["hours"]
    max_by_hour = df.groupby("hour")["profit_loss"].max()  # Series of maxes
    best_hour = max_by_hour.idxmax() if not max_by_hour.isna().all() else None
    best_profit = max_by_hour.max() if not max_by_hour.isna().all() else None
    print()
    print("Stats by hour of day:")
    if best_hour is not None:
        print(f"Best Trading Hour is [{best_hour}:00] with ${best_profit:.2f}")
    else:
        print("No trades found.")

    print(f"[08:00] - Wins: {hour_08_wins}, Losses: {hour_08_losses}")
    print(f"[09:00] - Wins: {hour_09_wins}, Losses: {hour_09_losses}")
    print(f"[10:00] - Wins: {hour_10_wins}, Losses: {hour_10_losses}")
    print(f"[11:00] - Wins: {hour_11_wins}, Losses: {hour_11_losses}")
    return h08, h09, h10, h11


def extra_stats(df):
    # avg risk
    convert_risk = df["risk_percentage"].str.replace("%", "").astype(float)
    avg_risk = convert_risk.mean()
    # max dd
    df['peak'] = df['balance'].cummax()  # Running max balance
    df['drawdown'] = (df['peak'] - df['balance']) / df['peak']  # Drawdown fraction
    max_dd_percent = df['drawdown'].max() * 100  # Max drawdown in %
    
    best_trade = df["profit_loss"].max()
    worst_trade = df["profit_loss"].min()
    avg_rr = df["rr"].mean()

    print()
    print("Extra Stats:")
    print(f"Avg Risk is: {avg_risk:.2f}%")
    print(f"Avg R/R: {avg_rr:.2f}")
    print(f"Best trade: ${best_trade:.2f}")
    print(f"Worst trade: ${worst_trade:.2f}")
    print(f"Max Drawdown: {max_dd_percent:.2f}%")
    return worst_trade, best_trade
    print()


if __name__ == "__main__":
    file_path = "data/the-lab-report-2024-December.csv"
    df = csv_reader(file_path)
    overall_stats(df)
    day_of_week_stats(df)
    hour_of_day_stats(df)
    extra_stats(df)

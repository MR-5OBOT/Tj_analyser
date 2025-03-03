import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns


def dataframe_check(df):
    # Handle empty DataFrame
    if df.empty:
        print("\nStats by hour of day:")
        print("No trades found.")
        return None, None, None, None
        # List of all required columns based on the DataFrame header image
        required_columns = [
            "date",
            "DoW",
            "symbol",
            "entry_time",
            "exit_time",
            "risk_by_contract",
            "risk_by_percentage",
            "wins",
            "losses",
            "p/l_by_pips",
            "p/l_by_dollar",
            "p/l_by_rr",
            "balance",
        ]

        # Check for missing columns
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            print(f"Error: The following required columns are missing: {', '.join(missing_columns)}")
            return False
        return True


def overall_stats(df):
    # Check if required columns exist
    if (
        "date" not in df.columns
        or "wins" not in df.columns
        or "p/l_by_dollar" not in df.columns
        or "risk_by_percentage" not in df.columns
        or "losses" not in df.columns
    ):
        print("Error: 'date' or 'wins' column missing.")
        return None

    # Work on a copy to avoid modifying the original
    df_copy = df.copy()

    winrate = df["wins"].count() / (df["wins"].count() + df["losses"].count())
    total_pl_dollar = df["p/l_by_dollar"].sum()
    avg_win = df[df["p/l_by_dollar"] > 0]["p/l_by_dollar"].mean()
    avg_loss = df[df["p/l_by_dollar"] < 0]["p/l_by_dollar"].mean()
    # total_trades = df.shape[0]  # Gets the number of rows as an integer
    total_trades = df["date"].count()

    # max dd
    df_copy["peak"] = df["balance"].cummax()  # Running max balance
    df["drawdown"] = (df_copy["peak"] - df["balance"]) / df_copy["peak"]  # Drawdown fraction
    max_dd_percent = df["drawdown"].max() * 100  # Max drawdown in %

    best_trade = df["p/l_by_dollar"].max()
    worst_trade = df["p/l_by_dollar"].min()
    avg_rr = df["p/l_by_rr"].mean()

    # Step 1: Check format using the first value
    first_value = str(df["risk_by_percentage"].iloc[0])  # Convert to string to check
    if first_value.endswith("%"):
        # If percentage string, remove % and convert to float
        df_copy["risk_converted"] = df["risk_by_percentage"].str.replace("%", "").astype(float)
    else:
        # If decimal, multiply by 100
        df_copy["risk_converted"] = df["risk_by_percentage"] * 100
    # Step 2: Format for printing (optional)
    df_copy["risk_formatted"] = df_copy["risk_converted"].map("{:.2f}%".format)

    avg_risk = df_copy["risk_converted"].mean()

    print()
    print("Overall stats: ")
    print(f"Total Trades : {total_trades}")
    print(f"Total P/L : ${total_pl_dollar:.2f}")
    print(f"Avg win : ${avg_win:.2f}")
    print(f"Avg loss : ${avg_loss:.2f}")
    print(f"Avg Risk is: {avg_risk:.2f}%")
    print(f"Avg R/R: {avg_rr:.2f}")
    print(f"Best trade: ${best_trade:.2f}")
    print(f"Worst trade: ${worst_trade:.2f}")
    print(f"Max Drawdown: {max_dd_percent:.2f}%")
    # df["drawdown"] = df["drawdown"].map("{:.4f}".format)  # for clean columns

    return winrate, total_pl_dollar, avg_win, avg_loss, total_trades, best_trade, worst_trade


def day_of_week_stats(df):
    # Work on a copy to avoid modifying the original
    df_copy = df.copy()

    # Check if required columns exist
    if "date" not in df.columns or "wins" not in df.columns:
        print("Error: 'date' or 'wins' column missing.")
        return None

    # Convert the 'date' column to datetime
    df["date"] = pd.to_datetime(df["date"])

    # Extract date as string without time (do this after datetime operations)
    df["date"] = df["date"].dt.strftime("%Y-%m-%d")

    if "DoW" not in df.columns:
        # Since 'date' is now a string, we need to convert it back to datetime for .dt.day_name()
        df["DoW"] = pd.to_datetime(df["date"]).dt.day_name().str.lower()
        # Filter for days with wins
        monday_wins = len(df[(df["wins"] > 0) & (df["DoW"] == "monday")])
        tuesday_wins = len(df[(df["wins"] > 0) & (df["DoW"] == "tuesday")])
        wednesday_wins = len(df[(df["wins"] > 0) & (df["DoW"] == "wednesday")])
        thursday_wins = len(df[(df["wins"] > 0) & (df["DoW"] == "thursday")])
        friday_wins = len(df[(df["wins"] > 0) & (df["DoW"] == "friday")])
    else:
        # Use existing DoW column (converted to lowercase for consistency)
        df["DoW"] = df["DoW"].str.lower()
        # Filter for days with wins
        monday_wins = len(df[(df["wins"] > 0) & (df["DoW"] == "monday")])
        tuesday_wins = len(df[(df["wins"] > 0) & (df["DoW"] == "tuesday")])
        wednesday_wins = len(df[(df["wins"] > 0) & (df["DoW"] == "wednesday")])
        thursday_wins = len(df[(df["wins"] > 0) & (df["DoW"] == "thursday")])
        friday_wins = len(df[(df["wins"] > 0) & (df["DoW"] == "friday")])

    print()
    print("Stats by day of week:")
    print(f"Total Monday wins: {monday_wins}")
    print(f"Total Tuesday wins: {tuesday_wins}")
    print(f"Total Wednesday wins: {wednesday_wins}")
    print(f"Total Thursday wins: {thursday_wins}")
    print(f"Total Friday wins: {friday_wins}")

    return monday_wins, tuesday_wins, wednesday_wins, thursday_wins, friday_wins


def hour_of_day_stats(df):
    # Work on a copy to avoid modifying the original
    df_copy = df.copy() if df is not None and not df.empty else pd.DataFrame()

    # Check if required columns exist
    if (
        "entry_time" not in df_copy.columns
        or "wins" not in df_copy.columns
        or "losses" not in df_copy.columns
        or "p/l_by_dollar" not in df_copy.columns
    ):
        print("Error: One or more required columns (entry_time, wins, losses, p/l_by_dollar) missing.")
        return None, df_copy  # Return original df unchanged

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
    hour_08_wins = len(df_copy[(df_copy["entry_time_td"] >= h08) & (df_copy["entry_time_td"] < h09) & (df_copy["wins"] > 0)])
    hour_09_wins = len(df_copy[(df_copy["entry_time_td"] >= h09) & (df_copy["entry_time_td"] < h10) & (df_copy["wins"] > 0)])
    hour_10_wins = len(df_copy[(df_copy["entry_time_td"] >= h10) & (df_copy["entry_time_td"] < h11) & (df_copy["wins"] > 0)])
    hour_11_wins = len(df_copy[(df_copy["entry_time_td"] >= h11) & (df_copy["entry_time_td"] < h12) & (df_copy["wins"] > 0)])

    # Losses per hour
    hour_08_losses = len(df_copy[(df_copy["entry_time_td"] >= h08) & (df_copy["entry_time_td"] < h09) & (df_copy["losses"] > 0)])
    hour_09_losses = len(df_copy[(df_copy["entry_time_td"] >= h09) & (df_copy["entry_time_td"] < h10) & (df_copy["losses"] > 0)])
    hour_10_losses = len(df_copy[(df_copy["entry_time_td"] >= h10) & (df_copy["entry_time_td"] < h11) & (df_copy["losses"] > 0)])
    hour_11_losses = len(df_copy[(df_copy["entry_time_td"] >= h11) & (df_copy["entry_time_td"] < h12) & (df_copy["losses"] > 0)])

    # Best profit/loss by hour
    max_08 = df_copy[(df_copy["entry_time_td"] >= h08) & (df_copy["entry_time_td"] < h09)]["p/l_by_dollar"].max()
    max_09 = df_copy[(df_copy["entry_time_td"] >= h09) & (df_copy["entry_time_td"] < h10)]["p/l_by_dollar"].max()
    max_10 = df_copy[(df_copy["entry_time_td"] >= h10) & (df_copy["entry_time_td"] < h11)]["p/l_by_dollar"].max()
    max_11 = df_copy[(df_copy["entry_time_td"] >= h11) & (df_copy["entry_time_td"] < h12)]["p/l_by_dollar"].max()

    # Get best hour by p/l
    df_copy["hour"] = df_copy["entry_time_td"].dt.components["hours"].fillna(0).astype(int)
    max_by_hour = df_copy.groupby("hour")["p/l_by_dollar"].max()  # Use df_copy
    best_hour = max_by_hour.idxmax() if not max_by_hour.isna().all() else None
    best_profit = max_by_hour.max() if not max_by_hour.isna().all() else None

    # Print stats
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

    return (h08, h09, h10, h11), df_copy


# data visualizations

# matplotlib setup
plt.style.use("dark_background")
plt.figure(figsize=(6, 6))


def data_reader(file_path):
    # df = pd.read_csv(file_path)
    df = pd.read_excel(file_path)
    print(df.head())
    print()
    return df


if __name__ == "__main__":
    file_path = "./data/journals_for_data_analysis.xlsx"  # index_col=0
    df = data_reader(file_path)

    # Check all required columns before proceeding
    if not dataframe_check(df):
        # If all columns are present, proceed with app logic
        print("All required columns are present. Running the application...")
    else:
        print("error something is messing in the dataframe please check tpl req")
        quit()

    overall_stats(df)
    day_of_week_stats(df)
    hour_of_day_stats(df)
    df.to_excel("output_data.xlsx", index=False)
    print("DataFrame saved to 'output_data.xlsx'")

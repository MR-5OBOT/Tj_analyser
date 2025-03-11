import os
import tkinter as tk
import webbrowser
from tkinter import filedialog, messagebox
from tkinter import ttk as ttk

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from PIL import Image, ImageTk

# Define required columns for validation
REQUIRED_COLUMNS = ["date", "symbol", "entry_time", "entry_exit", "risk_by_percentage", "outcome", "p/l_by_rr"]


# Directory check function
def check_directory(directory="./exported_data"):
    """Check if the directory exists, create it if it doesn't."""
    try:
        if not os.path.exists(directory):
            os.makedirs(directory)
            print(f"Created directory: {directory}")
        else:
            print(f"Directory already exists: {directory}")
        return True
    except PermissionError:
        messagebox.showerror("Directory Error", f"Permission denied to create directory: {directory}")
        return False
    except Exception as e:
        messagebox.showerror("Directory Error", f"Failed to create directory: {str(e)}")
        return False


# def cols_check(df):
#     if (
#         "date" not in df.columns
#         or "symbol" not in df.columns
#         or "entry_time" not in df.columns
#         or "entry_exit" not in df.columns
#         or "risk_by_percentage" not in df.columns
#         or "outcome" not in df.columns
#         or "p/l_by_rr" not in df.columns
#     ):
#         print("Error: One or more required columns missing.")
#         # quit()


def overall_stats(df):
    if (
        "date" not in df.columns
        or "p/l_by_percentage" not in df.columns
        or "p/l_by_rr" not in df.columns
        or "outcome" not in df.columns
    ):
        raise ValueError("Column 'date, outcome, p/l_by_percentage, p/l_by_rr' not found in DataFrame")

    df_copy = df.copy()
    wins = df["outcome"].value_counts()[["WIN"]].values.item()
    losses = df["outcome"].value_counts()[["LOSS"]].values.item()
    winrate = float((wins / (wins + losses)) * 100)
    total_trades = df.shape[0]
    pl_numeric = df["p/l_by_percentage"].str.replace("%", "").astype(float)
    total_pl = pl_numeric.sum()
    avg_win_percentage = pl_numeric[pl_numeric > 0].mean()
    avg_loss_percentage = pl_numeric[pl_numeric < 0].mean()
    df_copy["risk_converted"] = df["risk_by_percentage"].str.replace("%", "").astype(float)
    avg_risk = df_copy["risk_converted"].mean()
    avg_rr = df["p/l_by_rr"].mean()
    best_trade = pl_numeric.max()
    worst_trade = pl_numeric.min()
    df_copy["peak"] = pl_numeric.cummax()
    df_copy["drawdown"] = (df_copy["peak"] - pl_numeric) / df_copy["peak"]
    max_dd_percent = df_copy["drawdown"].max()

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
    return (winrate, max_dd_percent, avg_win_percentage, avg_loss_percentage, total_trades, best_trade, worst_trade, pl_numeric)


def day_of_week_stats(df, position=1):
    if "date" not in df.columns or "outcome" not in df.columns:
        raise ValueError("Column 'date, outcome' not found in DataFrame")
    df_copy = df.copy()
    df_copy["date"] = pd.to_datetime(df_copy["date"])
    if "DoW" not in df.columns:
        dow_series = df_copy["date"].dt.day_name().str.lower()
        dow_position = max(0, min(position, len(df_copy.columns)))
        df_copy.insert(dow_position, "DoW", dow_series)
    else:
        dow_series = df_copy["DoW"].str.lower()
        df_copy = df_copy.drop(columns="DoW")
        df_copy.insert(position, "DoW", dow_series)

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
        raise ValueError("Required columns not found in DataFrame")

    df_copy = df.copy()

    # Function to parse time flexibly
    def parse_time(time_str):
        try:
            # Try parsing as HH:MM:SS
            return pd.to_datetime(time_str, format="%H:%M:%S").time()
        except ValueError:
            try:
                # If HH:MM:SS fails, try HH:MM and append :00
                return pd.to_datetime(time_str + ":00", format="%H:%M:%S").time()
            except ValueError:
                # If both fail, default to 00:00
                print(f"Warning: Invalid time '{time_str}', defaulting to 00:00")
                return pd.to_datetime("00:00", format="%H:%M").time()

    # Apply the parsing function to entry_time
    df_copy["entry_time"] = df_copy["entry_time"].apply(parse_time)

    # Convert datetime.time to Timedelta
    def time_to_timedelta(time_obj):
        try:
            return pd.Timedelta(hours=time_obj.hour, minutes=time_obj.minute, seconds=time_obj.second)
        except AttributeError:
            return pd.Timedelta(0)

    df_copy["entry_time_td"] = df_copy["entry_time"].apply(time_to_timedelta)

    # Hour boundaries
    h08 = pd.to_timedelta("08:00:00")
    h09 = pd.to_timedelta("09:00:00")
    h10 = pd.to_timedelta("10:00:00")
    h11 = pd.to_timedelta("11:00:00")
    h12 = pd.to_timedelta("12:00:00")

    # Wins per hour
    hour_08_wins = len(df_copy[(df_copy["entry_time_td"] >= h08) & (df_copy["entry_time_td"] < h09) & (df_copy["outcome"] == "WIN")])
    hour_09_wins = len(df_copy[(df_copy["entry_time_td"] >= h09) & (df_copy["entry_time_td"] < h10) & (df_copy["outcome"] == "WIN")])
    hour_10_wins = len(df_copy[(df_copy["entry_time_td"] >= h10) & (df_copy["entry_time_td"] < h11) & (df_copy["outcome"] == "WIN")])
    hour_11_wins = len(df_copy[(df_copy["entry_time_td"] >= h11) & (df_copy["entry_time_td"] < h12) & (df_copy["outcome"] == "WIN")])

    # Losses per hour
    hour_08_losses = len(df_copy[(df_copy["entry_time_td"] >= h08) & (df_copy["entry_time_td"] < h09) & (df_copy["outcome"] == "LOSS")])
    hour_09_losses = len(df_copy[(df_copy["entry_time_td"] >= h09) & (df_copy["entry_time_td"] < h10) & (df_copy["outcome"] == "LOSS")])
    hour_10_losses = len(df_copy[(df_copy["entry_time_td"] >= h10) & (df_copy["entry_time_td"] < h11) & (df_copy["outcome"] == "LOSS")])
    hour_11_losses = len(df_copy[(df_copy["entry_time_td"] >= h11) & (df_copy["entry_time_td"] < h12) & (df_copy["outcome"] == "LOSS")])

    # Best hour by p/l
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


# Data visualizations
def pl_percentage_plot(df):
    if "date" not in df.columns or "risk_by_percentage" not in df.columns or "p/l_by_rr" not in df.columns:
        raise ValueError("Columns 'symbol, date, p/l_by_rr' not found in DataFrame")

    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%d-%m-%y")
    df_copy = df.copy()
    risk_converted = df_copy["risk_by_percentage"].str.replace("%", "").astype(float)
    pl_numeric = risk_converted * df["p/l_by_rr"]
    x = df["date"].index
    y = pl_numeric.cumsum()

    plt.style.use("dark_background")
    plt.figure(figsize=(6, 6))
    ax = plt.gca()
    sns.lineplot(x=x, y=y, label="P/L by %")
    plt.title("Performance By Percentage Gains")
    plt.xlabel("Date")
    plt.ylabel("P/L by %")
    plt.legend()
    ax.spines["right"].set_visible(False)
    ax.spines["top"].set_visible(False)
    plt.tight_layout()
    plt.savefig("./exported_data/gains_by_percentage.png")
    # plt.show()


def pl_by_symbol_rr(df):
    if "symbol" not in df.columns:
        raise ValueError("Column 'symbol' not found in DataFrame")

    dow = df["risk_by_percentage"].str.replace("%", "").astype(float)
    outcome = df["outcome"]

    plt.style.use("dark_background")
    plt.figure(figsize=(6, 6))
    sns.barplot(x=dow, y=outcome, hue=df["outcome"])
    plt.title("Performance By Percentage Gains")
    plt.tight_layout()
    plt.savefig("./exported_data/pl_by_symbol_rr.png")
    # plt.show()


def pl_hist(df):
    df_copy = df.copy()
    if "p/l_by_percentage" not in df.columns:
        raise ValueError("Column 'p/l_by_percentage' not found in DataFrame")

    risks = df_copy["p/l_by_percentage"].str.replace("%", "").astype(float)
    plt.style.use("dark_background")
    plt.figure(figsize=(6, 6))
    sns.histplot(risks, bins=15, kde=True)
    plt.title("Distribution of P/L by %")
    plt.tight_layout()
    plt.savefig("./exported_data/pl_distribution.png")
    # plt.show()


def boxplot_DoW(df):
    if "p/l_by_percentage" not in df.columns:
        raise ValueError("Column 'p/l_by_percentage' not found in DataFrame")

    df_copy = df.copy()
    pl = df_copy["risk_by_percentage"].str.replace("%", "").astype(float)
    plt.style.use("dark_background")
    plt.figure(figsize=(10, 6))
    sns.boxplot(x=df["DoW"], y=pl, hue=df["outcome"])
    plt.title("Boxplot for DoW vs pl by %")
    plt.tight_layout()
    plt.savefig("./exported_data/boxplot_DoW_vs_PL.png")
    # plt.show()


def risk_vs_reward_scatter(df):
    df_copy = df.copy()
    if "risk_by_percentage" not in df.columns or "p/l_by_percentage" not in df.columns:
        raise ValueError("Column 'risk_by_percentage' or 'p/l_by_percentage' not found in DataFrame")

    x = df_copy["risk_by_percentage"].str.replace("%", "").astype(float)
    y = df_copy["p/l_by_percentage"].str.replace("%", "").astype(float)

    plt.style.use("dark_background")
    plt.figure(figsize=(6, 6))
    sns.scatterplot(x=x, y=y, data=df, hue="outcome", palette="YlGnBu")
    plt.title("Risk vs Rewards")
    plt.legend()
    plt.tight_layout()
    plt.savefig("./exported_data/risk_vs_reward.png")
    # plt.show()


def heatmap_rr(df):
    """
    A heatmap showing the cumulative sum of R/R over Day of Week & Hour of Day.
    """

    # Function to parse time flexibly
    def parse_time(time_str):
        try:
            # Try parsing as HH:MM:SS
            return pd.to_datetime(time_str, format="%H:%M:%S").time()
        except ValueError:
            try:
                # If HH:MM:SS fails, try HH:MM and append :00
                return pd.to_datetime(time_str + ":00", format="%H:%M:%S").time()
            except ValueError:
                # If both fail, default to 00:00
                print(f"Warning: Invalid time '{time_str}', defaulting to 00:00")
                return pd.to_datetime("00:00", format="%H:%M").time()

    # Parse entry_time and extract hours
    hours = df["entry_time"].apply(parse_time).apply(lambda x: x.hour if pd.notna(x) else None)

    # Create pivot table: hours as index, DoW as columns, p/l_by_rr as values
    matrix = df.pivot_table(values="p/l_by_rr", index=hours, columns="DoW", aggfunc="sum")
    # print(matrix)

    plt.style.use("dark_background")
    plt.figure(figsize=(10, 6))
    sns.heatmap(matrix, annot=True, cmap="RdBu_r")
    plt.title("Sum of R/R by Days vs Hours")
    plt.xlabel("")
    plt.ylabel("Hour of Entry")
    plt.yticks(rotation=0)
    plt.tight_layout()
    plt.savefig("./exported_data/days_vs_hours_rr.png")
    # plt.show()


# GUI functions
def open_link():
    webbrowser.open("https://docs.google.com/spreadsheets/d/1JwaEanv8tku6dXSGWsu3c7KFZvCtEjQEcKkzO0YcrPQ/edit?usp=sharing")


def validate_file(df, required_columns=REQUIRED_COLUMNS):
    """Check if all required columns are present in the DataFrame."""
    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        return False, f"Missing columns: {', '.join(missing_columns)}"
    return True, "File is valid."


def upload_file(root_frame, max_size_mb=10):
    """Safely upload and validate a CSV or Excel file."""
    try:
        file_path = filedialog.askopenfilename(
            title="Select a file", filetypes=[("CSV Files", "*.csv"), ("Excel Files", "*.xlsx")], parent=root_frame
        )
        if not file_path:
            return None

        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
        if file_size_mb > max_size_mb:
            messagebox.showerror("File Error", f"File size ({file_size_mb:.2f} MB) exceeds the maximum limit of {max_size_mb} MB.")
            return None

        if file_path.endswith(".csv"):
            df = pd.read_csv(file_path)
        elif file_path.endswith(".xlsx"):
            df = pd.read_excel(file_path)
        else:
            messagebox.showerror("File Error", "Unsupported file format. Please use CSV or Excel.")
            return None

        is_valid, message = validate_file(df)
        if not is_valid:
            messagebox.showerror("Validation Error", message)
            return None

        print("File loaded successfully:")
        # print(df.head())
        messagebox.showinfo("Success", "File uploaded and validated successfully!")
        return df

    except pd.errors.EmptyDataError:
        messagebox.showerror("File Error", "The selected file is empty.")
        return None
    except pd.errors.ParserError:
        messagebox.showerror("File Error", "Error parsing the file. Please check its format.")
        return None
    except PermissionError:
        messagebox.showerror("File Error", "Permission denied to access the file.")
        return None
    except Exception as e:
        messagebox.showerror("Unexpected Error", f"An error occurred: {str(e)}")
        return None


def process_data(df):
    """Process the DataFrame after upload."""
    if df is not None:
        if not check_directory("./exported_data"):
            return

        overall_stats(df)
        df = day_of_week_stats(df)
        hour_of_day_stats(df)
        pl_percentage_plot(df)
        pl_by_symbol_rr(df)
        pl_hist(df)
        risk_vs_reward_scatter(df)
        boxplot_DoW(df)
        heatmap_rr(df)
        df.to_csv("./exported_data/output_data.csv", index=False)
        print("Data processing complete and saved to 'output_data.csv'")


# GUI setup
root = tk.Tk()
root.title("Tj_Analyser")
root.geometry("400x250")  # Slightly larger for better spacing
root.resizable(True, True)  # Allow resizing

# Style configuration
style = ttk.Style(root)
style.configure("TButton", font=("Helvetica", 10), padding=5)
style.configure("TLabel", font=("Helvetica", 12))

# Main frame
root_frame = ttk.Frame(root, padding=(10, 10), borderwidth=2, relief="raised")
root_frame.pack(fill="both", expand=True)

# Grid configuration for responsiveness
root_frame.grid_columnconfigure(0, weight=1)
root_frame.grid_columnconfigure(1, weight=1)
root_frame.grid_rowconfigure(0, weight=1)
root_frame.grid_rowconfigure(1, weight=1)
root_frame.grid_rowconfigure(2, weight=1)
root_frame.grid_rowconfigure(3, weight=1)


# Update status function
def update_status(message, color="green"):
    status_label.config(text=message, foreground=color)


# Example integration with on_upload (modify your original on_upload)
def on_upload():
    global df_storage
    update_status("Uploading file...", "blue")
    df_storage = upload_file(root_frame)
    if df_storage is not None:
        update_status("Processing data...", "blue")
        process_data(df_storage)
        update_status("Data processed successfully", "green")
    else:
        update_status("Upload failed", "red")


# Title label
title_label = ttk.Label(root_frame, text="Trading Journal Analyser", style="TLabel")
title_label.grid(column=0, row=0, columnspan=2, pady=(0, 10), sticky="n")

# Buttons
cfds_tpl = ttk.Button(root_frame, text="Journal Template", command=open_link)
cfds_tpl.grid(column=0, row=1, columnspan=2, pady=5, padx=5, sticky="ew")

import_data = ttk.Button(root_frame, text="Import Data File", command=on_upload)
import_data.grid(column=0, row=2, columnspan=2, pady=10, padx=5, sticky="ew")

# Status label
status_label = ttk.Label(root_frame, text="Ready", foreground="green")
status_label.grid(column=0, row=3, columnspan=2, pady=5, sticky="s")

# Ensure proper exit
root.protocol("WM_DELETE_WINDOW", root.quit)

if __name__ == "__main__":
    root.mainloop()

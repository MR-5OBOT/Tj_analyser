import os
import tkinter as tk
import webbrowser
from tkinter import filedialog, messagebox, ttk

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns


# Core functions
def check_directory(directory="./exported_data"):
    if not os.path.exists(directory):
        os.makedirs(directory)
    return True


def calc_stats(df):
    wins = df["outcome"].value_counts().get("WIN", 0)
    losses = df["outcome"].value_counts().get("LOSS", 0)
    winrate = (wins / (wins + losses) * 100) if (wins + losses) > 0 else 0.0
    if df["pl_by_percentage"].dropna().apply(lambda x: isinstance(x, str) and x.endswith("%")).all():
        pl_raw = df["pl_by_percentage"].str.replace("%", "").astype(float)
    else:
        pl_raw = df["pl_by_percentage"] * 100  # Convert decimal to %
    pl = pl_raw.cumsum()  # Cumulative for equity curve
    stats = {"Total Trades": len(df), "Win Rate": f"{winrate:.2f}%", "Total P/L": f"{pl.iloc[-1]:.2f}%"}
    return stats, pl, pl_raw  # Return raw P/L too for other plots


def plot_gains_curve(df, pl):
    x = pd.to_datetime(df["date"]).dt.strftime("%d-%m-%y")
    plt.style.use("dark_background")
    sns.lineplot(x=x, y=pl, label="Equity")
    plt.title("Equity Curve")
    plt.xlabel("")
    plt.ylabel("Cumulative P/L (%)")
    plt.legend()
    plt.xticks(rotation=70)
    plt.tight_layout()
    plt.savefig("./exported_data/equity_curve.png")
    plt.close()


def plot_outcome_by_day(df):
    df["DoW"] = pd.to_datetime(df["date"]).dt.day_name().str.lower()
    plt.style.use("dark_background")
    data = df.groupby(["DoW", "outcome"]).size().reset_index(name="count")
    sns.barplot(data=data, x="DoW", y="count", hue="outcome", palette="YlGnBu")
    plt.title("Wins and Losses by Day")
    plt.xlabel("Day of Week")
    plt.ylabel("Count")
    plt.tight_layout()
    plt.savefig("./exported_data/outcome_by_day.png")
    plt.close()


def pl_distribution(pl_raw):
    plt.style.use("dark_background")
    sns.histplot(pl_raw, bins=10, kde=True, palette="YlGnBu")
    plt.title("Distribution of P/L by %")
    plt.xlabel("P/L (%)")
    plt.tight_layout()
    plt.savefig("./exported_data/pl_distribution.png")
    plt.close()


def boxplot_DoW(df, pl_raw):
    df["DoW"] = pd.to_datetime(df["date"]).dt.day_name().str.lower()
    plt.style.use("dark_background")
    # plt.figure(figsize=(10, 6))
    sns.boxplot(x=df["DoW"], y=pl_raw, hue=df["outcome"], palette="YlGnBu")
    plt.title("Boxplot of P/L by Day")
    plt.xlabel("")
    plt.ylabel("P/L (%)")
    plt.tight_layout()
    plt.savefig("./exported_data/boxplot_DoW_vs_PL.png")
    plt.close()


def risk_vs_reward_scatter(df, pl_raw):
    if df["risk_by_percentage"].dropna().apply(lambda x: isinstance(x, str) and x.endswith("%")).all():
        risk = df["risk_by_percentage"].str.replace("%", "").astype(float)
    else:
        risk = df["risk_by_percentage"] * 100

    plt.style.use("dark_background")
    sns.scatterplot(x=risk, y=pl_raw, hue=df["outcome"], palette="coolwarm")
    plt.title("Risk vs Reward")
    plt.xlabel("Risk (%)")
    plt.ylabel("P/L (%)")
    plt.legend()
    plt.tight_layout()
    plt.savefig("./exported_data/risk_vs_reward.png")
    plt.close()


def heatmap_rr(df):
    def parse_time(time_str):
        try:
            return pd.to_datetime(time_str, format="%H:%M:%S").time()
        except ValueError:
            try:
                return pd.to_datetime(time_str + ":00", format="%H:%M:%S").time()
            except:
                return pd.to_datetime("00:00", format="%H:%M").time()

    df["DoW"] = pd.to_datetime(df["date"]).dt.day_name().str.lower()
    hours = df["entry_time"].apply(parse_time).apply(lambda x: x.hour if pd.notna(x) else None)
    matrix = pd.pivot_table(df, values="pl_by_rr", index=hours, columns="DoW", aggfunc="sum")
    plt.style.use("dark_background")
    sns.heatmap(matrix, annot=True, cmap="RdBu_r")
    plt.title("Cumulative P/L by Days vs Hours")
    plt.xlabel("")
    plt.ylabel("Hour of Entry")
    plt.yticks(rotation=0)
    plt.tight_layout()
    plt.savefig("./exported_data/days_vs_hours_pl.png")
    plt.close()


# GUI and processing
def upload_file(root_frame):
    file_path = filedialog.askopenfilename(filetypes=[("CSV Files", "*.csv"), ("Excel Files", "*.xlsx")], parent=root_frame)
    if not file_path:
        return None
    df = pd.read_csv(file_path) if file_path.endswith(".csv") else pd.read_excel(file_path)

    required_cols = ["date", "outcome", "pl_by_percentage", "risk_by_percentage", "entry_time"]
    if not all(col in df.columns for col in required_cols):
        messagebox.showerror("Error", f"Missing required columns: {', '.join(required_cols)}")
        return None
    return df


def process_data(df):
    check_directory()
    stats, pl, pl_raw = calc_stats(df)
    plot_gains_curve(df, pl)
    plot_outcome_by_day(df)
    pl_distribution(pl_raw)
    boxplot_DoW(df, pl_raw)
    risk_vs_reward_scatter(df, pl_raw)
    heatmap_rr(df)
    df.to_csv("./exported_data/trade_data.csv", index=False)
    return stats


# GUI setup
root = tk.Tk()
root.title("Tj_Analyser")
root.geometry("400x250")
root.resizable(True, True)

style = ttk.Style(root)
style.configure("TButton", font=("Helvetica", 10), padding=5)
style.configure("TLabel", font=("Helvetica", 12))

root_frame = ttk.Frame(root, padding=(10, 10), borderwidth=2, relief="raised")
root_frame.pack(fill="both", expand=True)

root_frame.grid_columnconfigure(0, weight=1)
root_frame.grid_columnconfigure(1, weight=1)
root_frame.grid_rowconfigure(0, weight=1)
root_frame.grid_rowconfigure(1, weight=1)
root_frame.grid_rowconfigure(2, weight=1)
root_frame.grid_rowconfigure(3, weight=1)


def open_link():
    webbrowser.open("https://docs.google.com/spreadsheets/d/1JwaEanv8tku6dXSGWsu3c7KFZvCtEjQEcKkzO0YcrPQ/edit?usp=sharing")


def update_status(message, color="green"):
    status_label.config(text=message, foreground=color)


def on_upload():
    global df_storage
    update_status("Uploading file...", "blue")
    df_storage = upload_file(root_frame)
    if df_storage is not None:
        update_status("Processing data...", "blue")
        stats = process_data(df_storage)
        update_status("Data processed successfully", "green")
        messagebox.showinfo("Success", f"Stats: {stats}\nCheck exported_data/ directory.")
    else:
        update_status("Upload failed", "red")


title_label = ttk.Label(root_frame, text="Trading Journal Analyser", style="TLabel")
title_label.grid(column=0, row=0, columnspan=2, pady=(0, 10), sticky="n")

cfds_tpl = ttk.Button(root_frame, text="Journal Template", command=open_link)
cfds_tpl.grid(column=0, row=1, columnspan=2, pady=5, padx=5, sticky="ew")

import_data = ttk.Button(root_frame, text="Import Data File", command=on_upload)
import_data.grid(column=0, row=2, columnspan=2, pady=10, padx=5, sticky="ew")

status_label = ttk.Label(root_frame, text="Ready", foreground="green")
status_label.grid(column=0, row=3, columnspan=2, pady=5, sticky="s")

root.protocol("WM_DELETE_WINDOW", root.quit)

if __name__ == "__main__":
    root.mainloop()

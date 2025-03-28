import os
import tkinter as tk
import webbrowser
from tkinter import filedialog, messagebox, ttk

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns
from matplotlib.backends.backend_pdf import PdfPages


# Core functions
def check_directory(directory="./exported_data"):
    if not os.path.exists(directory):
        os.makedirs(directory)
    return True


def calc_stats(df):
    required_cols = ["date", "outcome", "pl_by_percentage", "risk_by_percentage", "entry_time", "pl_by_rr"]
    if not all(col in df.columns for col in required_cols):
        raise ValueError(f"Missing required columns: {', '.join(required_cols)}")

    # Overall Stats
    wins = df["outcome"].value_counts().get("WIN", 0)
    losses = df["outcome"].value_counts().get("LOSS", 0)
    winrate = (wins / (wins + losses)) * 100 if (wins + losses) > 0 else 0.0
    total_trades = len(df)
    pl_raw = (
        df["pl_by_percentage"].str.replace("%", "").astype(float)
        if df["pl_by_percentage"].dtype == "object"
        else df["pl_by_percentage"] * 100
    )
    pl = pl_raw.cumsum()
    total_pl = pl_raw.sum()
    avg_win = pl_raw[pl_raw > 0].mean() or 0
    avg_loss = pl_raw[pl_raw < 0].mean() or 0
    risk_converted = (
        df["risk_by_percentage"].str.replace("%", "").astype(float)
        if df["risk_by_percentage"].dtype == "object"
        else df["risk_by_percentage"] * 100
    )
    avg_risk = risk_converted.mean() or 0
    avg_rr = df["pl_by_rr"].mean() or 0
    best_trade = pl_raw.max() or 0
    worst_trade = pl_raw.min() or 0
    df["peak"] = pl_raw.cummax()
    df["drawdown"] = (df["peak"] - pl_raw) / df["peak"]
    max_dd = df["drawdown"].max() or 0

    stats = {
        "Total Trades": total_trades,
        "Win Rate": f"{winrate:.2f}%",
        "Total P/L": f"{total_pl:.2f}%",
        "Avg Win": f"{avg_win:.2f}%",
        "Avg Loss": f"{avg_loss:.2f}%",
        "Avg Risk": f"{avg_risk:.2f}%",
        "Avg R/R": f"{avg_rr:.2f}",
        "Best Trade": f"{best_trade:.2f}%",
        "Worst Trade": f"{worst_trade:.2f}%",
        "Max DD": f"{max_dd:.2f}%",
    }

    return pl, pl_raw, stats


def plot_gains_curve(df, pl):
    x = range(len(df))
    plt.style.use("dark_background")
    sns.lineplot(x=x, y=pl, label="Gains (%)")
    plt.title("Gains Curve")
    plt.xlabel("Trades")
    plt.ylabel("P/L (%)")
    plt.legend()
    plt.xticks(rotation=70, fontsize=8)
    plt.tight_layout()
    plt.savefig("./exported_data/equity_curve.png")


def plot_outcome_by_day(df):
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["DoW"] = df["date"].dt.day_name().str.lower()
    plt.style.use("dark_background")
    data = df.groupby(["DoW", "outcome"]).size().reset_index(name="count")
    sns.barplot(data=data, x="DoW", y="count", hue="outcome", palette="Paired", edgecolor="black", linewidth=1)
    plt.title("Wins vs Losses by Day")
    plt.xlabel("")
    plt.ylabel("Count")
    plt.tight_layout()
    plt.savefig("./exported_data/outcome_by_day.png")


def pl_distribution(pl_raw):
    plt.style.use("dark_background")
    sns.histplot(pl_raw, bins=10, kde=True)
    plt.title("P/L Distribution")
    plt.xlabel("P/L (%)")
    plt.tight_layout()
    plt.savefig("./exported_data/pl_distribution.png")


def boxplot_DoW(df, pl_raw):
    df["DoW"] = pd.to_datetime(df["date"]).dt.day_name().str.lower()
    plt.style.use("dark_background")
    sns.boxplot(x=df["DoW"], y=pl_raw, hue=df["outcome"], palette="YlGnBu")
    plt.title("P/L by Day")
    plt.xlabel("")
    plt.ylabel("P/L (%)")
    plt.tight_layout()
    plt.savefig("./exported_data/boxplot_DoW_vs_PL.png")


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
    plt.title("P/L by Day & Hour")
    plt.xlabel("")
    plt.ylabel("Entry Hour")
    plt.yticks(rotation=0)
    plt.tight_layout()
    plt.savefig("./exported_data/days_vs_hours_pl.png")


# PDF Export
def export_to_pdf(df, pl, pl_raw):
    pdf_path = "./exported_data/trading_report.pdf"
    with PdfPages(pdf_path) as pdf:

        plt.figure(figsize=(8, 6))
        plot_gains_curve(df, pl)
        pdf.savefig()
        plt.close()

        plt.figure(figsize=(8, 6))
        plot_outcome_by_day(df)
        pdf.savefig()
        plt.close()

        plt.figure(figsize=(8, 6))
        pl_distribution(pl_raw)
        pdf.savefig()
        plt.close()

        plt.figure(figsize=(8, 6))
        heatmap_rr(df)
        pdf.savefig()
        plt.close()

        plt.figure(figsize=(8, 6))
        boxplot_DoW(df, pl_raw)
        pdf.savefig()
        plt.close()

        plt.figure(figsize=(8, 6))
        risk_vs_reward_scatter(df, pl_raw)
        pdf.savefig()
        plt.close()

    return pdf_path


# GUI and Processing
def upload_file():
    file_path = filedialog.askopenfilename(filetypes=[])
    if not file_path:
        return None
    df = pd.read_csv(file_path) if file_path.endswith(".csv") else pd.read_excel(file_path)
    required_cols = ["date", "outcome", "pl_by_percentage", "risk_by_percentage", "entry_time", "pl_by_rr"]
    if not all(col in df.columns for col in required_cols):
        messagebox.showerror("Error", f"Missing required columns: {', '.join(required_cols)}")
        return None
    return df


def process_data(df):
    check_directory()
    pl, pl_raw, stats = calc_stats(df)
    print(stats)
    plot_gains_curve(df, pl)
    plot_outcome_by_day(df)
    pl_distribution(pl_raw)
    heatmap_rr(df)
    boxplot_DoW(df, pl_raw)
    risk_vs_reward_scatter(df, pl_raw)
    pdf_path = export_to_pdf(df, pl, pl_raw)
    # df.to_csv("./exported_data/trade_data.csv", index=False)
    return pdf_path


# GUI Setup
root = tk.Tk()
root.title("Tj_Analyser")
root.geometry("300x250")
root.resizable(True, True)

style = ttk.Style(root)
root.tk.call("source", "./Forest-ttk-theme/forest-dark.tcl")  # Load custom theme
style.theme_use("forest-dark")  # Set custom theme

style.configure("TButton", font=("Helvetica", 12), padding=5)

root.grid_columnconfigure(0, weight=1)
root.grid_columnconfigure(1, weight=1)
root.grid_rowconfigure(0, weight=1)
root.grid_rowconfigure(1, weight=1)
root.grid_rowconfigure(2, weight=1)
root.grid_rowconfigure(3, weight=1)


def open_link():
    webbrowser.open("https://docs.google.com/spreadsheets/d/1JwaEanv8tku6dXSGWsu3c7KFZvCtEjQEcKkzO0YcrPQ/edit?usp=sharing")


def update_status(message, color="green"):
    status_label.config(text=message, foreground=color)


def on_upload():
    update_status("Uploading file...", "violet")
    df_storage = upload_file()
    if df_storage is not None:
        process_data(df_storage)
        update_status("Data processed successfully", "violet")
    else:
        update_status("Upload failed", "red")


title_label = ttk.Label(root, text="Trading Journal Analyser", style="TLabel", font=("Helvetica", 16))
title_label.grid(column=0, row=0, columnspan=2, pady=10, padx=10, sticky="n")

cfds_tpl = ttk.Button(root, text="Journal Template", command=open_link)
cfds_tpl.grid(column=0, row=1, columnspan=2, pady=10, padx=15, sticky="ew")

import_data = ttk.Button(root, text="Import Data File", command=on_upload)
import_data.grid(column=0, row=2, columnspan=2, pady=10, padx=15, sticky="ew")

status_label = ttk.Label(root, text="Ready", foreground="green", font=("Helvetica", 12))
status_label.grid(column=0, row=3, columnspan=2, pady=10, sticky="s")

root.protocol("WM_DELETE_WINDOW", root.quit)

if __name__ == "__main__":
    root.mainloop()

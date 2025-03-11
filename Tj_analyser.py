import os
import tkinter as tk
import webbrowser
from tkinter import filedialog, messagebox, ttk
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
import pandas as pd
import seaborn as sns

# Stats Functions (Your Originals, Slightly Adjusted for PDF)
def overall_stats(df):
    if not all(col in df.columns for col in ["date", "pl_by_percentage", "pl_by_rr", "outcome"]):
        raise ValueError("Column 'date, outcome, pl_by_percentage, pl_by_rr' not found")
    wins = df["outcome"].value_counts().get("WIN", 0)
    losses = df["outcome"].value_counts().get("LOSS", 0)
    winrate = float((wins / (wins + losses)) * 100) if (wins + losses) > 0 else 0.0
    total_trades = df.shape[0]
    pl_numeric = df["pl_by_percentage"].str.replace("%", "").astype(float) if df["pl_by_percentage"].str.endswith("%").all() else df["pl_by_percentage"] * 100
    total_pl = pl_numeric.sum()
    avg_win_percentage = pl_numeric[pl_numeric > 0].mean() or 0
    avg_loss_percentage = pl_numeric[pl_numeric < 0].mean() or 0
    risk_converted = df["risk_by_percentage"].str.replace("%", "").astype(float) if df["risk_by_percentage"].str.endswith("%").all() else df["risk_by_percentage"] * 100
    avg_risk = risk_converted.mean() or 0
    avg_rr = df["p/l_by_rr"].mean() or 0
    best_trade = pl_numeric.max() or 0
    worst_trade = pl_numeric.min() or 0
    df["peak"] = pl_numeric.cummax()
    df["drawdown"] = (df["peak"] - pl_numeric) / df["peak"]
    max_dd_percent = df["drawdown"].max() or 0
    return {
        "Total Trades": total_trades,
        "Win Rate": f"{winrate:.2f}%",
        "Total P/L": f"{total_pl:.2f}%",
        "Avg Win": f"{avg_win_percentage:.2f}%",
        "Avg Loss": f"{avg_loss_percentage:.2f}%",
        "Avg Risk": f"{avg_risk:.2f}%",
        "Avg R/R": f"{avg_rr:.2f}",
        "Best Trade": f"{best_trade:.2f}%",
        "Worst Trade": f"{worst_trade:.2f}%",
        "Max DD": f"{max_dd_percent:.2f}%"
    }, pl_numeric

def day_of_week_stats(df):
    if "date" not in df.columns or "outcome" not in df.columns:
        raise ValueError("Column 'date, outcome' not found")
    df["DoW"] = pd.to_datetime(df["date"]).dt.day_name().str.lower()
    dow_stats = {}
    for day in ["monday", "tuesday", "wednesday", "thursday", "friday"]:
        wins = len(df[(df["outcome"] == "WIN") & (df["DoW"] == day)])
        losses = len(df[(df["outcome"] == "LOSS") & (df["DoW"] == day)])
        dow_stats[day.capitalize()] = f"W: {wins}, L: {losses}"
    return dow_stats

def hour_of_day_stats(df):
    if not all(col in df.columns for col in ["date", "entry_time", "outcome"]):
        raise ValueError("Required columns not found")
    def parse_time(time_str):
        try:
            return pd.to_datetime(time_str, format="%H:%M:%S").time()
        except ValueError:
            try:
                return pd.to_datetime(time_str + ":00", format="%H:%M:%S").time()
            except:
                return pd.to_datetime("00:00", format="%H:%M").time()
    df["entry_time"] = df["entry_time"].apply(parse_time)
    df["hour"] = df["entry_time"].apply(lambda x: x.hour)
    hour_stats = {}
    for h in range(8, 12):
        wins = len(df[(df["hour"] == h) & (df["outcome"] == "WIN")])
        losses = len(df[(df["hour"] == h) & (df["outcome"] == "LOSS")])
        hour_stats[f"{h:02d}:00"] = f"W: {wins}, L: {losses}"
    return hour_stats

# Your Original Visualization Functions (Unchanged)
def plot_gains_curve(df, pl):
    x = pd.to_datetime(df["date"]).dt.strftime("%d-%m-%y")
    plt.style.use("dark_background")
    sns.lineplot(x=x, y=pl, label="Equity")
    plt.title("Equity Curve")
    plt.xlabel("Date")
    plt.ylabel("Cumulative P/L (%)")
    plt.legend()
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
    sns.histplot(pl_raw, bins=10, kde=True)
    plt.title("Distribution of P/L by %")
    plt.tight_layout()
    plt.savefig("./exported_data/pl_distribution.png")
    plt.close()

def boxplot_DoW(df, pl_raw):
    plt.style.use("dark_background")
    plt.figure(figsize=(10, 6))
    sns.boxplot(x=df["DoW"], y=pl_raw, hue=df["outcome"])
    plt.title("Boxplot for DoW vs pl by %")
    plt.xlabel("")
    plt.ylabel("Risk by %")
    plt.tight_layout()
    plt.savefig("./exported_data/boxplot_DoW_vs_PL.png")
    plt.close()

def risk_vs_reward_scatter(df, pl_raw):
    if df["risk_by_percentage"].dropna().apply(lambda x: isinstance(x, str) and x.endswith("%")).all():
        x = df["risk_by_percentage"].str.replace("%", "").astype(float)
    else:
        x = df["risk_by_percentage"].astype(float) * 100
    plt.style.use("dark_background")
    sns.scatterplot(x=x, y=pl_raw, data=df, hue="outcome", palette="coolwarm")
    plt.title("Risk vs Rewards")
    plt.legend()
    plt.tight_layout()
    plt.savefig("./exported_data/risk_vs_reward.png")
    plt.close()

def heatmap_rr(df, pl_raw):
    def parse_time(time_str):
        try:
            return pd.to_datetime(time_str, format="%H:%M:%S").time()
        except ValueError:
            try:
                return pd.to_datetime(time_str + ":00", format="%H:%M:%S").time()
            except:
                return pd.to_datetime("00:00", format="%H:%M").time()
    hours = df["entry_time"].apply(parse_time).apply(lambda x: x.hour if pd.notna(x) else None)
    matrix = df.pivot_table(values=pl_raw, index=hours, columns="DoW", aggfunc="sum")
    plt.style.use("dark_background")
    sns.heatmap(matrix, annot=True, cmap="RdBu_r")
    plt.title("P/L by Days vs Hours")
    plt.xlabel(" ")
    plt.ylabel("Hour of Entry")
    plt.yticks(rotation=0)
    plt.tight_layout()
    plt.savefig("./exported_data/days_vs_hours_rr.png")
    plt.close()

# PDF Export Function
def export_to_pdf(df, pl_raw):
    pdf_path = "./exported_data/trading_report.pdf"
    with PdfPages(pdf_path) as pdf:
        # Page 1: Stats
        plt.figure(figsize=(8.5, 11))
        plt.style.use("dark_background")
        overall, pl_numeric = overall_stats(df)
        dow = day_of_week_stats(df)
        hour = hour_of_day_stats(df)
        stats_text = "Overall Stats:\n" + "\n".join([f"{k}: {v}" for k, v in overall.items()])
        stats_text += "\n\nDay of Week Stats:\n" + "\n".join([f"{k}: {v}" for k, v in dow.items()])
        stats_text += "\n\nHour of Day Stats:\n" + "\n".join([f"{k}: {v}" for k, v in hour.items()])
        plt.text(0.1, 0.95, stats_text, fontsize=10, ha="left", va="top", color="white", wrap=True)
        plt.axis("off")
        pdf.savefig()
        plt.close()

        # Page 2: Equity Curve
        plt.figure(figsize=(8, 6))
        plot_gains_curve(df, pl_numeric.cumsum())
        pdf.savefig()
        plt.close()

        # Page 3: Outcome by Day
        plt.figure(figsize=(8, 6))
        plot_outcome_by_day(df)
        pdf.savefig()
        plt.close()

        # Page 4: P/L Distribution
        plt.figure(figsize=(8, 6))
        pl_distribution(pl_raw)
        pdf.savefig()
        plt.close()

        # Page 5: Boxplot DoW
        plt.figure(figsize=(10, 6))
        boxplot_DoW(df, pl_raw)
        pdf.savefig()
        plt.close()

        # Page 6: Risk vs Reward
        plt.figure(figsize=(8, 6))
        risk_vs_reward_scatter(df, pl_raw)
        pdf.savefig()
        plt.close()

        # Page 7: Heatmap
        plt.figure(figsize=(10, 6))
        heatmap_rr(df, pl_raw)
        pdf.savefig()
        plt.close()
    return pdf_path

# GUI and Processing
def check_directory(directory="./exported_data"):
    if not os.path.exists(directory):
        os.makedirs(directory)
    return True

def upload_file(root_frame):
    file_path = filedialog.askopenfilename(filetypes=[("CSV Files", "*.csv"), ("Excel Files", "*.xlsx")], parent=root_frame)
    if not file_path:
        return None
    df = pd.read_csv(file_path) if file_path.endswith(".csv") else pd.read_excel(file_path)
    required_cols = ["date", "outcome", "pl_by_percentage", "risk_by_percentage", "entry_time", "p/l_by_rr"]
    if not all(col in df.columns for col in required_cols):
        messagebox.showerror("Error", f"Missing required columns: {', '.join(required_cols)}")
        return None
    pl_raw = df["p/l_by_percentage"].str.replace("%", "").astype(float) if df["p/l_by_percentage"].str.endswith("%").all() else df["p/l_by_percentage"] * 100
    return df, pl_raw

def process_data(df, pl_raw):
    check_directory()
    # Generate PNGs as before
    plot_gains_curve(df, pl_raw.cumsum())
    plot_outcome_by_day(df)
    pl_distribution(pl_raw)
    boxplot_DoW(df, pl_raw)
    risk_vs_reward_scatter(df, pl_raw)
    heatmap_rr(df, pl_raw)
    df.to_csv("./exported_data/trade_data.csv", index=False)
    # Export to PDF
    pdf_path = export_to_pdf(df, pl_raw)
    return pdf_path

# GUI Setup
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
    global df_storage, pl_raw_storage
    update_status("Uploading file...", "blue")
    result = upload_file(root_frame)
    if result:
        df_storage, pl_raw_storage = result
        update_status("Processing data...", "blue")
        pdf_path = process_data(df_storage, pl_raw_storage)
        update_status("Data processed successfully", "green")
        messagebox.showinfo("Success", f"PDF saved: {pdf_path}\nPNG plots in exported_data/")
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

import datetime
import os
import tkinter as tk
import webbrowser
from tkinter import filedialog, messagebox, ttk

import matplotlib.pyplot as plt
import pandas as pd
from matplotlib.backends.backend_pdf import PdfPages

from modules.plots import (boxplot_DoW, heatmap_rr, outcome_by_day, pl_curve,
                           pl_distribution, risk_vs_reward_scatter)
from modules.statsTable import create_stats_table


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


# PDF Export
def export_to_pdf(df, pl, pl_raw):
    # Get current date in YYYY-MM-DD format
    current_date = datetime.datetime.now().strftime("%Y-%m-%d")
    # Create filename with date
    pdf_filename = f"trading_report_{current_date}.pdf"
    pdf_path = f"./exported_data/{pdf_filename}"
    _, _, stats = calc_stats(df)  # Get the stats dictionary

    with PdfPages(pdf_path) as pdf:
        # Add stats page first
        stats_fig = create_stats_table(stats)
        pdf.savefig(stats_fig)
        plt.close(stats_fig)

        plt.figure(figsize=(8, 6))
        pl_curve(df, pl)
        pdf.savefig()
        plt.close()

        plt.figure(figsize=(8, 6))
        outcome_by_day(df)
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


def update_progress(progress):
    progress_bar["value"] = progress
    root.update_idletasks()  # Force UI update


def process_data(df):
    check_directory()
    # Initialize progress
    update_progress(0)
    pl, pl_raw, stats = calc_stats(df)
    update_progress(10)
    pl_curve(df, pl)
    update_progress(20)
    outcome_by_day(df)
    update_progress(30)
    pl_distribution(pl_raw)
    update_progress(40)
    heatmap_rr(df)
    update_progress(50)
    boxplot_DoW(df, pl_raw)
    update_progress(60)
    risk_vs_reward_scatter(df, pl_raw)
    update_progress(70)

    pdf_path = export_to_pdf(df, pl, pl_raw)
    update_progress(100)

    return pdf_path


def tpl():
    webbrowser.open("https://docs.google.com/spreadsheets/d/1JwaEanv8tku6dXSGWsu3c7KFZvCtEjQEcKkzO0YcrPQ/edit?usp=sharing")


def update_status(message, color="green"):
    status_label.config(text=message, foreground=color)


def on_upload():
    update_status("Uploading file...", "violet")
    df_storage = upload_file()

    if df_storage is not None:
        # Reset progress bar
        progress_bar["value"] = 0
        root.update_idletasks()

        try:
            # Process data with progress updates
            pdf_path = process_data(df_storage)
            update_status("Data processed successfully", "violet")

            # Show completion message
            messagebox.showinfo("Success", f"Report generated:\n{pdf_path}")

        except Exception as e:
            update_status("Error during processing", "red")
            messagebox.showerror("Error", f"An error occurred:\n{str(e)}")

        finally:
            # Reset progress bar
            progress_bar["value"] = 0
    else:
        update_status("Upload failed", "red")
        progress_bar["value"] = 0


# # GUI Setup
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


title_label = ttk.Label(root, text="Trading Journal Analyser", style="TLabel", font=("Helvetica", 16))
title_label.grid(column=0, row=0, columnspan=2, pady=10, padx=10, sticky="n")

cfds_tpl = ttk.Button(root, text="Journal Template", command=tpl)
cfds_tpl.grid(column=0, row=1, columnspan=2, pady=10, padx=15, sticky="ew")

import_data = ttk.Button(root, text="Import Data File", command=on_upload)
import_data.grid(column=0, row=2, columnspan=2, pady=10, padx=15, sticky="ew")

status_label = ttk.Label(root, text="Ready", foreground="green", font=("Helvetica", 12))
status_label.grid(column=0, row=4, columnspan=2, pady=10, sticky="s")

progress_bar = ttk.Progressbar(root, orient="horizontal", length=200, mode="determinate")
progress_bar.grid(column=0, row=3, columnspan=2, pady=10, sticky="ew")

root.protocol("WM_DELETE_WINDOW", root.quit)

if __name__ == "__main__":
    root.mainloop()

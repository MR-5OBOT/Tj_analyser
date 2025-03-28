import datetime
import io
import os

import matplotlib.pyplot as plt
import pandas as pd
import streamlit as st
from matplotlib.backends.backend_pdf import PdfPages

from modules.plots import (boxplot_DoW, heatmap_rr, pl_distribution,
                           plot_gains_curve, plot_outcome_by_day,
                           risk_vs_reward_scatter)
from modules.statsTable import create_stats_table


# Ensure export directory exists
def check_directory(directory="./exported_data"):
    if not os.path.exists(directory):
        os.makedirs(directory)
    return True


# Load data
def load_data(file):
    df = pd.read_csv(file) if file.name.endswith(".csv") else pd.read_excel(file)
    required_cols = ["date", "outcome", "pl_by_percentage", "risk_by_percentage", "entry_time", "pl_by_rr"]
    if not all(col in df.columns for col in required_cols):
        raise ValueError("Missing required columns. Please use the required template.")
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["DoW"] = df["date"].dt.day_name().str.lower()
    return df


# Calculate statistics
@st.cache_data
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


# Main app
st.title("Trading Journal Analyser")

uploaded_file = st.file_uploader("Upload your trades data (CSV or Excel)", type=["csv", "xlsx"])

if uploaded_file:
    df = load_data(uploaded_file)
    pl, pl_raw, stats = calc_stats(df)
    # st.write("Stats:", stats)

    check_directory()
    # Display plots and cache figures
    st.subheader("Visualizations")
    plot_functions = [
        (create_stats_table, (stats,)),
        (plot_gains_curve, (df, pl)),
        (plot_outcome_by_day, (df,)),
        (pl_distribution, (pl_raw,)),
        (heatmap_rr, (df,)),
        (boxplot_DoW, (df, pl_raw)),
        (risk_vs_reward_scatter, (df, pl_raw)),
    ]
    total_plots = len(plot_functions)
    progress_bar = st.progress(0)
    cached_figures = []  # Store figures for reuse
    for i, (func, args) in enumerate(plot_functions):
        fig = func(*args)
        st.pyplot(fig)
        cached_figures.append(fig)  # Cache the figure
        progress_bar.progress((i + 1) / total_plots)

    # Center the button using columns
    col1, col2, col3 = st.columns([1, 1, 1])
    with col2:
        if st.button("Generate PDF Report"):
            buffer = io.BytesIO()
            with PdfPages(buffer) as pdf:
                pdf_progress = st.progress(0)
                for i, fig in enumerate(cached_figures):
                    pdf.savefig(fig)  # Reuse cached figure
                    pdf_progress.progress((i + 1) / total_plots)
                # No need to close figures here since they’re reused
            pdf_data = buffer.getvalue()
            st.download_button(label="Download PDF", data=pdf_data, file_name="trading_report.pdf", mime="application/pdf")

    # Clean up cached figures after everything is done
    for fig in cached_figures:
        plt.close(fig)

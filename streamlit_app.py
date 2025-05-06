import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns
import streamlit as st

############################
from helpers.plots import (
    boxplot_DoW,
    create_stats_table,
    heatmap_rr,
    outcome_by_day,
    pl_curve,
    pl_distribution,
    risk_vs_reward_scatter,
)
from helpers.stats import pl_raw, stats_table
from helpers.utils import df_check


def visualizations(pl: pd.Series):
    with col1:
        fig = pl_curve(df, pl)
        st.pyplot(fig)
    with col2:
        fig = outcome_by_day(df)
        st.pyplot(fig)
    with col1:
        fig = pl_distribution(pl)
        st.pyplot(fig)
    with col2:
        fig = heatmap_rr(df)
        st.pyplot(fig)


def run_process(df: pd.DataFrame):
    pl = pl_raw(df)
    st.dataframe(df)
    visualizations(pl)


st.set_page_config(layout="wide", page_title="Trading Journal Dashboard")
input_method = st.radio("Choose input method", ["URL", "Upload"], horizontal=True)
col1, col2 = st.columns(2, gap="small")

# Handle URL input
if input_method == "URL":
    csv_url = st.text_input("Enter CSV URL")
    if csv_url:
        try:
            df = pd.read_csv(csv_url, usecols=range(8))
            run_process(df)
        except Exception as e:
            st.error(f"Error reading CSV: {e}")
# Handle file upload
elif input_method == "Upload":
    uploaded_file = st.file_uploader("Upload CSV file", type=["csv"])
    if uploaded_file:
        try:
            df = pd.read_csv(uploaded_file, usecols=range(8))
            run_process(df)
        except Exception as e:
            st.error(f"Error reading CSV: {e}")
else:
    st.write("Please upload a CSV or Excel file to visualize your trading journal.")

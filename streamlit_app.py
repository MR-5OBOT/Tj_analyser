import pandas as pd
import streamlit as st

from helpers.plots import (
    heatmap_rr,
    outcome_by_day,
    pl_curve,
    pl_distribution,
)
from helpers.stats import pl_raw
from helpers.utils import df_check

# Page config
st.set_page_config(layout="wide", page_title="Trading Journal Dashboard")
st.title("Trading Journal Dashboard")  # Add title as header in app

input_method = st.radio("Choose input method", ["URL", "Upload"], horizontal=True)
col1, col2 = st.columns(2, gap="small")


def visualizations(df: pd.DataFrame, pl: pd.Series):
    with col1:
        with st.container():
            # st.subheader("P&L Curve")
            fig = pl_curve(df, pl)
            st.pyplot(fig)

        with st.container():
            # st.subheader("P&L Distribution")
            fig = pl_distribution(pl)
            st.pyplot(fig)

    with col2:
        with st.container():
            # st.subheader("Outcome by Day")
            fig = outcome_by_day(df)
            st.pyplot(fig)

        with st.container():
            # st.subheader("Risk/Reward Heatmap")
            fig = heatmap_rr(df)
            st.pyplot(fig)


def run_process(df: pd.DataFrame):
    df_check(df, [])
    pl = pl_raw(df)
    visualizations(df, pl)
    st.dataframe(df)  # display teh updated df


# Load data
if input_method == "URL":
    csv_url = st.text_input("Enter CSV URL")
    if csv_url:
        try:
            df = pd.read_csv(csv_url, usecols=range(8))
            run_process(df)
        except Exception as e:
            st.error(f"Error reading CSV: {e}")

elif input_method == "Upload":
    uploaded_file = st.file_uploader("Upload CSV file", type=["csv"])
    if uploaded_file:
        try:
            df = pd.read_csv(uploaded_file, usecols=range(8))
            run_process(df)
        except Exception as e:
            st.error(f"Error reading CSV: {e}")
else:
    st.write("Please upload a CSV or enter a URL to visualize your trading journal.")


#

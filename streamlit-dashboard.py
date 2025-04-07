import matplotlib.pyplot as plt
import pandas as pd
import streamlit as st
from matplotlib.backends.backend_pdf import PdfPages

# from modules.plots import (boxplot_DoW, heatmap_rr, outcome_by_day, pl_curve,
#                            pl_distribution, risk_vs_reward_scatter)
# from modules.statsTable import create_stats_table


# Set page configuration (optional for dark theme)
st.set_page_config(page_title="Trading Reports", layout="wide", initial_sidebar_state="expanded")

# Title of the dashboard
st.title("My Cool Dark Dashboard")

# Some text
st.write("Welcome to my cool dark-themed dashboard built with Streamlit!")

# Add a slider widget
value = st.slider("Pick a value", 0, 100)
st.write(f"You selected: {value}")

# Add a button
if st.button("Click me"):
    st.write("You clicked the button!")

# Tj_Analyser

A Python-based GUI application for analyzing trading journals, providing statistical insights and visualizations for CFDs and Futures trading data.

## Features

- **File Upload**: Supports CSV and Excel files with size validation (default max: 10 MB).
- **Statistics**:
  - Overall stats: Total trades, win rate, total P/L, average win/loss percentage, average risk, average risk-reward ratio (R/R), best/worst trade, and max drawdown.
  - Day-of-week performance: Win/loss counts for Monday through Friday.
  - Hour-of-day performance: Win/loss counts and best trading hour based on P/L.
- **Visualizations**:
  - Balance history graph (P/L percentage over time).
  - P/L distribution histogram.
  - Boxplot for day-of-week vs. P/L.
  - Risk vs. reward scatter plot.
  - Heatmap of R/R by day and hour.
- **GUI**:
  - Simple Tkinter interface with buttons for CFDs/Futures templates and data import.
  - Status bar for real-time feedback (e.g., "Uploading file...", "Data processed successfully").

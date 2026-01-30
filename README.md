# Tj_Analyser

A Python CLI tool for analyzing trading journals, providing statistical insights and visualizations for trading performance data.

## Features

- **Data Import**: Fetches trading data directly from Google Sheets CSV exports
- **Report Types**:
  - **Weekly Reports**: Quick performance summaries by day of the week
  - **Overall Reports**: Comprehensive analysis with multiple visualizations
- **Statistics**:
  - Win rate, profit factor, expectancy
  - Risk/reward metrics, consecutive wins/losses
  - Best/worst trades, average risk per trade
- **Visualizations**:
  - R/R performance curves and bar charts
  - Outcome distribution by day and time
  - Heatmaps of R/R by day & hour
  - Risk vs reward scatter plots
  - Monthly performance breakdowns
- **PDF Export**: All reports saved as professional PDF documents

## Usage

```bash
# Generate weekly report
python Tj_analyser.py --type weekly

# Generate overall report
python Tj_analyser.py --type overall
```

## Requirements

See `requirements.txt` for dependencies. Install with:
```bash
pip install -r requirements.txt
```


# Tj_Analyser

A Python CLI tool for analyzing trading journals from different CSV and Excel formats through a universal column-mapping config.

## What Changed

- Accepts local `.csv`, `.xlsx`, `.xlsm`, and `.xls` journal files
- Uses `journal_config.toml` to map any incoming column names into one internal schema
- Cleans dates, times, numeric fields, and outcomes more aggressively
- Skips calculations and charts when the needed columns are missing
- Keeps the existing chart colors and dark style
- Adds new charts for drawdown and asset performance

# Canonical Internal Fields
## Recommended Journal Column Names

If you want the cleanest setup, try to name your journal columns close to these:

- `trade_date`
- `trade_day`
- `asset`
- `entry_time`
- `exit_time`
- `position_size`
- `outcome`
- `rr`
- `risk_amount`
- `reward_amount`
- `stop_loss_points`
- `session`
- `setup`
- `notes`
Example config:

```toml
[source]
path = "friend_journal.csv"
sheet_name = 0

[columns]
trade_date = "data"
trade_day = ""
asset = "asset"
entry_time = "entry time"
exit_time = ""
position_size = ""
outcome = "win_loss"
rr = ""
risk_amount = "risk"
reward_amount = "reward"
stop_loss_points = ""
session = ""
setup = ""
notes = ""
```

In that example:

- `trade_day` will be derived from `trade_date` if the date is valid
- `rr` will be calculated from `reward_amount / risk_amount`
- charts that need missing columns will be skipped automatically
- the CLI will print the detected mappings before analysis starts

Example CLI log:

```text
--- Detected Journal Mappings ---
data -> trade_date
asset -> asset
risk -> risk_amount
reward -> reward_amount
win_loss -> outcome
entry time -> entry_time
```

## Example Config

```toml
[source]
path = "my_friend_journal.xlsx"
sheet_name = 0

[columns]
trade_date = "data"
asset = "asset"
risk_amount = "risk"
reward_amount = "reward"
outcome = "win_loss"
entry_time = "entry time"
rr = ""
trade_day = ""
stop_loss_points = ""
```

If a field is missing, leave it as an empty string. The analyser will skip charts and metrics that depend on it.

## Usage

```bash
# Analyse a local journal with the default config file
python Tj_analyser.py --type overall --input my_journal.csv

# Analyse using a custom config file
python Tj_analyser.py --type overall --input my_journal.xlsx --config my_config.toml

# Weekly report
python Tj_analyser.py --type weekly --input my_journal.csv
```

If `--input` is not passed, the app will still fall back to the old Google Sheets URLs.

## Current Optional Charts

The report will include charts only when the needed columns exist:

- Stats summary table
- Cumulative R/R curve
- Weekly outcomes by day
- R/R by month
- Outcome by weekday
- Heatmap of R/R by day and hour
- Outcomes by custom time ranges
- R/R vs entry-hour range bubble chart
- Distribution of stop-loss points
- Position size vs R/R scatter
- R/R vs stop-loss points scatter
- Drawdown curve
- R/R by asset

## Weekly PDF Layout

The weekly PDF is now kept simple:

- one summary page
- one bar chart showing total `R` for each weekday
- green/positive days stay above `0`
- losing days go below `0`

## Weekly Summary Stats

The weekly summary page is kept lighter than the overall report and focuses on:

- total trades
- week range
- total R/R
- winning trades
- losing trades
- breakeven trades
- best day
- worst day

## Install

```bash
pip install -r requirements.txt
```

import numpy as np
import pandas as pd


def df_check(df: pd.DataFrame, required_columns: list[str]) -> None:
    if df is None or df.empty:
        raise ValueError("DataFrame is None or empty.")
    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")


def fix_csv_format(input_file, output_file):
    """
    Converts a poorly formatted CSV (with spaces/tabs) into proper comma-separated format.
    Keeps timestamps (date + time) together as one field.
    """
    with open(input_file, "r") as infile, open(output_file, "w") as outfile:
        for line in infile:
            parts = line.strip().split()

            if not parts:
                continue

            if len(parts) >= 8:
                timestamp = f"{parts[0]} {parts[1]}"
                rest = parts[2:]
                clean_line = ",".join([timestamp] + rest)
            else:
                clean_line = ",".join(parts)

            outfile.write(clean_line + "\n")

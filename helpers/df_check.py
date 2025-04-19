import pandas as pd


def df_check(df: pd.DataFrame) -> None:
    required_columns = [
        "date",
        "outcome",
        "pl_by_percentage",
        "risk_by_percentage",
        "entry_time",
        "exit_time",
        "pl_by_rr",
    ]
    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")

    # Add additional checks (e.g., data types, non-empty dataframe)
    if df.empty:
        raise ValueError("The provided DataFrame is empty.")
    # if not pd.api.types.is_datetime64_any_dtype(df["date"]):
    #     raise ValueError("The 'date' column must be in a datetime format.")

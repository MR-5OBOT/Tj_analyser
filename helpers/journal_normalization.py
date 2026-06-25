import pandas as pd

from config import (
    CANONICAL_COLUMNS,
    COLUMN_ALIASES,
    MINIMUM_REQUIRED_COLUMNS,
    OUTCOME_VALUE_MAP,
)
from helpers.data_cleaning import clean_numeric_series, convert_to_datetime
from helpers.utils import normalize_label


def normalize_journal(df: pd.DataFrame, journal_config: dict) -> pd.DataFrame:
    """Rename, clean, and enrich raw journal data into the internal schema."""
    renamed, detected_mappings = _rename_columns(df, journal_config.get("columns", {}))
    normalized = pd.DataFrame(index=renamed.index)

    for column in CANONICAL_COLUMNS:
        if column in renamed.columns:
            normalized[column] = renamed[column]

    normalized = _clean_columns(normalized, journal_config.get("outcome_map", {}))
    normalized = _derive_columns(normalized)
    normalized = normalized.dropna(how="all").reset_index(drop=True)

    missing_required = [
        column for column in MINIMUM_REQUIRED_COLUMNS if column not in normalized.columns
    ]
    if missing_required:
        # "outcome" can be derived from an R-multiple column, or from reward+risk columns,
        # so reaching here means none of those were found. Give the user an actionable hint.
        raise ValueError(
            "Could not find trade results in this file. Map a column to one of: "
            "'outcome' (WIN/LOSS/BE), 'rr' (R-multiple), or both 'reward_amount' and "
            "'risk_amount'."
        )

    normalized.attrs["detected_mappings"] = detected_mappings
    return normalized


def _rename_columns(
    df: pd.DataFrame, configured_columns: dict[str, str | None]
) -> tuple[pd.DataFrame, dict[str, str]]:
    normalized_source_names = {normalize_label(column): column for column in df.columns}
    rename_map: dict[str, str] = {}
    detected_mappings: dict[str, str] = {}

    # Explicit user-provided mappings win over everything.
    for canonical_name, explicit_source in configured_columns.items():
        if not explicit_source:
            continue

        source_column = _match_source_column(df.columns, explicit_source)
        if source_column:
            rename_map[source_column] = canonical_name
            detected_mappings[canonical_name] = source_column

    # Match each column against its short list of accepted names (case/spacing-insensitive).
    for canonical_name, aliases in COLUMN_ALIASES.items():
        if canonical_name in rename_map.values():
            continue

        for alias in aliases:
            match = normalized_source_names.get(normalize_label(alias))
            if match:
                rename_map[match] = canonical_name
                detected_mappings[canonical_name] = match
                break

    return df.rename(columns=rename_map), detected_mappings


def _match_source_column(columns: pd.Index, desired_name: str) -> str | None:
    normalized_columns = {normalize_label(column): column for column in columns}
    return normalized_columns.get(normalize_label(desired_name))


def _clean_columns(df: pd.DataFrame, outcome_map: dict[str, str]) -> pd.DataFrame:
    cleaned = df.copy()

    if "trade_date" in cleaned.columns:
        cleaned["trade_date"] = _safe_to_datetime(cleaned["trade_date"])

    for time_column in ("entry_time", "exit_time"):
        if time_column in cleaned.columns:
            cleaned[time_column] = _normalize_time_series(cleaned[time_column])

    for numeric_column in ("position_size", "rr", "risk_amount", "reward_amount", "stop_loss_points"):
        if numeric_column in cleaned.columns:
            cleaned[numeric_column] = clean_numeric_series(cleaned[numeric_column], return_nan=True)

    if "trade_day" in cleaned.columns:
        cleaned["trade_day"] = cleaned["trade_day"].astype("string").str.strip().str.lower()

    if "asset" in cleaned.columns:
        cleaned["asset"] = cleaned["asset"].astype("string").str.strip()

    if "outcome" in cleaned.columns:
        cleaned["outcome"] = (
            cleaned["outcome"]
            .astype("string")
            .str.strip()
            .str.lower()
            .map(lambda value: outcome_map.get(value, value.upper() if isinstance(value, str) else value))
        )

    return cleaned


def _derive_columns(df: pd.DataFrame) -> pd.DataFrame:
    derived = df.copy()

    if "trade_day" not in derived.columns and "trade_date" in derived.columns:
        derived["trade_day"] = derived["trade_date"].dt.day_name().str.lower()

    if "rr" not in derived.columns and {"reward_amount", "risk_amount"}.issubset(derived.columns):
        valid_risk = derived["risk_amount"].replace(0, pd.NA)
        derived["rr"] = derived["reward_amount"] / valid_risk

    if "rr" in derived.columns and "outcome" not in derived.columns:
        derived["outcome"] = pd.Series(pd.NA, index=derived.index, dtype="string")

    if "outcome" in derived.columns and "rr" in derived.columns:
        missing_outcomes = derived["outcome"].isna() | (derived["outcome"].astype(str).str.strip() == "")
        derived.loc[missing_outcomes & (derived["rr"] > 0), "outcome"] = "WIN"
        derived.loc[missing_outcomes & (derived["rr"] < 0), "outcome"] = "LOSS"
        derived.loc[missing_outcomes & (derived["rr"] == 0), "outcome"] = "BE"

    if "trade_day" in derived.columns:
        derived["trade_day"] = derived["trade_day"].astype("string").str.strip().str.lower()

    if "outcome" in derived.columns:
        derived["outcome"] = derived["outcome"].astype("string").str.strip().str.upper()

    return derived


def _safe_to_datetime(series: pd.Series) -> pd.Series:
    try:
        return convert_to_datetime(series)
    except ValueError:
        return pd.to_datetime(series, errors="coerce")


def _normalize_time_series(series: pd.Series) -> pd.Series:
    text = series.astype("string").str.strip()
    text = text.mask(text == "")
    out = pd.Series(pd.NA, index=series.index, dtype="string")

    parts = text.str.extract(r"^(\d{1,2}):(\d{2})(?::(\d{2}))?$")
    hour = pd.to_numeric(parts[0], errors="coerce")
    minute = pd.to_numeric(parts[1], errors="coerce")
    second = pd.to_numeric(parts[2].fillna("0"), errors="coerce")
    valid = hour.between(0, 23) & minute.between(0, 59) & second.between(0, 59)
    if valid.any():
        h = hour.loc[valid].astype(int).astype(str).str.zfill(2)
        m = minute.loc[valid].astype(int).astype(str).str.zfill(2)
        s = second.loc[valid].astype(int).astype(str).str.zfill(2)
        out.loc[valid] = h + ":" + m + ":" + s

    remaining = out.isna() & text.notna()
    if remaining.any():
        parsed = pd.to_datetime(text.loc[remaining], errors="coerce")
        parsed_valid = parsed.notna()
        parsed_text = parsed.loc[parsed_valid].dt.strftime("%H:%M:%S")
        out.loc[parsed_text.index] = parsed_text.astype("string")

    return out

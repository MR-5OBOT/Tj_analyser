import json
from io import BytesIO
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

import httpx
import numpy as np
import pandas as pd
from fastapi import UploadFile
from pandas.errors import EmptyDataError, ParserError

from backend.files import cleanup_expired_reports, report_pdf_path
from backend.logging_utils import get_logger
from backend.models import (
    AnalyzeRequestForm,
    AnalyzeResponse,
    InspectResponse,
    SchemaColumn,
    SchemaResponse,
)
from backend.settings import settings
from backend.url_utils import normalize_source_url
from config import CANONICAL_COLUMNS, COLUMN_ALIASES, FIELD_LABELS, OUTCOME_VALUE_MAP
from helpers.journal_normalization import detect_column_mappings, normalize_journal
from helpers.reporting import build_report, export_pdf_report

logger = get_logger("backend.service")


def build_runtime_config(
    column_mappings: dict | None = None,
    outcome_map: dict | None = None,
    *,
    sheet_name: int = 0,
) -> dict:
    """Create a runtime config payload compatible with the normalization layer."""
    return {
        "source": {"path": "", "sheet_name": sheet_name},
        "columns": {column: None for column in CANONICAL_COLUMNS} | (column_mappings or {}),
        "outcome_map": OUTCOME_VALUE_MAP | (outcome_map or {}),
    }


async def load_dataframe_from_request(
    upload: UploadFile | None,
    file_url: str | None,
    *,
    sheet_name: int = 0,
) -> pd.DataFrame:
    """Load a journal DataFrame from an uploaded file or a remote URL."""
    if upload is None and not file_url:
        logger.error("request_missing_source")
        raise ValueError("Provide either an uploaded file or a file URL.")

    if upload is not None:
        logger.info("loading_uploaded_file filename=%s sheet_name=%s", upload.filename, sheet_name)
        content = await upload.read()
        return _load_dataframe_from_bytes(
            content,
            filename=upload.filename or "journal.csv",
            sheet_name=sheet_name,
        )

    file_url = normalize_source_url(file_url)

    async with httpx.AsyncClient(
        timeout=settings.request_timeout_seconds,
        follow_redirects=True,
    ) as client:
        try:
            logger.info("loading_remote_file url=%s sheet_name=%s", file_url, sheet_name)
            response = await client.get(file_url)
            response.raise_for_status()
            resolved_filename = _resolve_remote_filename(file_url, response.headers.get("content-type"))
            return _load_dataframe_from_bytes(
                response.content,
                filename=resolved_filename,
                sheet_name=sheet_name,
            )
        except httpx.TimeoutException as exc:
            logger.exception("remote_file_timeout url=%s timeout_seconds=%s", file_url, settings.request_timeout_seconds)
            raise ValueError("Remote file request timed out.") from exc
        except httpx.HTTPStatusError as exc:
            logger.exception(
                "remote_file_http_error url=%s status_code=%s",
                file_url,
                exc.response.status_code,
            )
            raise ValueError(f"Remote file request failed with status {exc.response.status_code}.") from exc
        except httpx.RequestError as exc:
            logger.exception("remote_file_request_error url=%s", file_url)
            raise ValueError("Could not download the remote file.") from exc


def analyze_journal(
    raw_df: pd.DataFrame,
    *,
    form: AnalyzeRequestForm,
) -> AnalyzeResponse:
    """Normalize the journal, generate a PDF report, and return the API response payload."""
    cleanup_expired_reports()
    logger.info("analysis_started rows=%s", len(raw_df))
    runtime_config = build_runtime_config(
        column_mappings=form.column_mappings,
        outcome_map=form.outcome_map,
        sheet_name=form.sheet_name,
    )
    normalized_df = normalize_journal(raw_df, runtime_config)
    logger.info(
        "journal_normalized rows=%s mapped_columns=%s",
        len(normalized_df),
        ",".join(normalized_df.attrs.get("detected_mappings", {}).keys()),
    )
    if normalized_df.empty:
        logger.warning("journal_empty_after_normalization")
        raise ValueError("No valid journal rows remained after cleaning.")
    plots, stats = build_report(normalized_df)

    report_id = uuid4().hex
    output_path = report_pdf_path(report_id)
    logger.info("pdf_generation_started report_id=%s output_path=%s", report_id, output_path)
    export_pdf_report(plots, report_type="Overall", output_path=output_path)
    logger.info("pdf_generation_finished report_id=%s", report_id)

    detected_mappings = normalized_df.attrs.get("detected_mappings", {})
    source_columns = [str(column) for column in raw_df.columns]
    return AnalyzeResponse(
        report_id=report_id,
        rows_processed=int(len(normalized_df)),
        detected_mappings=_to_json_safe(detected_mappings),
        source_columns=source_columns,
        unmapped_columns=_unmapped_columns(source_columns, detected_mappings),
        stats=_to_json_safe(stats),
        download_url=f"/api/reports/{report_id}",
    )


def build_schema() -> SchemaResponse:
    """Describe every accepted field, its 3 accepted names, and the result requirement.

    Powers the upload screen so the app shows users exactly how to name their columns
    without hardcoding the list.
    """
    columns = [
        SchemaColumn(
            field=field,
            label=FIELD_LABELS.get(field, field.replace("_", " ").title()),
            description=CANONICAL_COLUMNS.get(field, ""),
            accepted_names=COLUMN_ALIASES.get(field, []),
        )
        for field in CANONICAL_COLUMNS
    ]
    return SchemaResponse(
        columns=columns,
        required_one_of=["outcome", "rr"],
        note=(
            "Name each column one of its accepted names (capitalization and spacing don't "
            "matter). You must include at least an 'outcome' or an 'rr' column — without one, "
            "analysis can't run. Every other field is optional and unlocks more charts."
        ),
    )


def inspect_columns(raw_df: pd.DataFrame, *, column_mappings: dict | None = None) -> InspectResponse:
    """Preview how a journal's headers map to the internal schema, without analyzing it."""
    source_columns = [str(column) for column in raw_df.columns]
    detected_mappings = detect_column_mappings(raw_df, column_mappings)
    missing_required = _missing_required(detected_mappings)
    logger.info(
        "inspect_columns source_count=%s detected=%s missing_required=%s",
        len(source_columns),
        ",".join(detected_mappings.keys()),
        ",".join(missing_required),
    )
    return InspectResponse(
        source_columns=source_columns,
        detected_mappings=_to_json_safe(detected_mappings),
        unmapped_columns=_unmapped_columns(source_columns, detected_mappings),
        missing_required=missing_required,
    )


def _unmapped_columns(source_columns: list[str], detected_mappings: dict) -> list[str]:
    mapped = {str(value) for value in detected_mappings.values()}
    return [column for column in source_columns if column not in mapped]


def _missing_required(detected_mappings: dict) -> list[str]:
    """Report 'outcome' as missing only when it can't be derived from rr or reward+risk."""
    detected = set(detected_mappings.keys())
    outcome_satisfiable = (
        "outcome" in detected
        or "rr" in detected
        or {"reward_amount", "risk_amount"}.issubset(detected)
    )
    return [] if outcome_satisfiable else ["outcome"]


def parse_optional_json(raw_value: str | None) -> dict:
    """Parse an optional JSON object from multipart form data."""
    if not raw_value:
        return {}
    try:
        value = json.loads(raw_value)
    except json.JSONDecodeError as exc:
        logger.exception("invalid_json_text payload=%s", raw_value[:200])
        raise ValueError("Invalid JSON form field.") from exc
    if not isinstance(value, dict):
        logger.error("invalid_json_payload value_type=%s", type(value).__name__)
        raise ValueError("Expected a JSON object.")
    return value


def _load_dataframe_from_bytes(content: bytes, *, filename: str, sheet_name: int = 0) -> pd.DataFrame:
    suffix = Path(filename).suffix.lower()
    logger.info("dataframe_load_attempt filename=%s suffix=%s sheet_name=%s", filename, suffix, sheet_name)

    is_excel = suffix in {".xlsx", ".xls", ".xlsm"}
    try:
        if is_excel:
            df = pd.read_excel(BytesIO(content), sheet_name=sheet_name)
            logger.info("dataframe_loaded_excel rows=%s columns=%s", len(df), list(df.columns))
        else:
            # Default to CSV for .csv and for unknown/extension-less sources (e.g. Google
            # Sheets export links). utf-8-sig transparently strips a leading BOM.
            df = pd.read_csv(BytesIO(content), encoding="utf-8-sig", skip_blank_lines=True)
            logger.info("dataframe_loaded_csv suffix=%s rows=%s columns=%s", suffix, len(df), list(df.columns))
    except EmptyDataError as exc:
        logger.exception("dataframe_empty_file filename=%s", filename)
        raise ValueError("The file is empty.") from exc
    except ParserError as exc:
        logger.exception("dataframe_parse_error filename=%s suffix=%s", filename, suffix)
        raise ValueError("Could not parse the file content.") from exc
    except ValueError as exc:
        logger.exception("dataframe_value_error filename=%s suffix=%s sheet_name=%s", filename, suffix, sheet_name)
        raise ValueError(str(exc)) from exc
    except Exception as exc:
        logger.exception("dataframe_unexpected_error filename=%s suffix=%s", filename, suffix)
        raise ValueError("Unexpected file parsing error.") from exc

    return _tidy_raw_dataframe(df)


def _tidy_raw_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Drop fully-blank rows and the empty trailing columns that spreadsheet exports add."""
    # Spreadsheet exports often include empty trailing columns rendered as "Unnamed: N".
    blank_unnamed = [
        column
        for column in df.columns
        if str(column).startswith("Unnamed:") and df[column].isna().all()
    ]
    if blank_unnamed:
        df = df.drop(columns=blank_unnamed)

    return df.dropna(how="all").reset_index(drop=True)


def _resolve_remote_filename(file_url: str, content_type: str | None) -> str:
    parsed_url = urlparse(file_url)
    suffix = Path(parsed_url.path).suffix.lower()
    if suffix:
        return f"remote{suffix}"

    query = parse_qs(parsed_url.query)
    output_values = [value.lower() for value in query.get("output", [])]
    if "csv" in output_values:
        logger.info("remote_file_type_detected_from_query url=%s resolved_suffix=.csv", file_url)
        return "remote.csv"

    normalized_content_type = (content_type or "").split(";")[0].strip().lower()
    content_type_map = {
        "text/csv": ".csv",
        "application/csv": ".csv",
        "application/vnd.ms-excel": ".xls",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    }
    mapped_suffix = content_type_map.get(normalized_content_type)
    if mapped_suffix:
        logger.info(
            "remote_file_type_detected_from_content_type url=%s content_type=%s resolved_suffix=%s",
            file_url,
            normalized_content_type,
            mapped_suffix,
        )
        return f"remote{mapped_suffix}"

    logger.warning(
        "remote_file_type_undetected url=%s content_type=%s path=%s",
        file_url,
        normalized_content_type,
        parsed_url.path,
    )
    return file_url


def _to_json_safe(value):
    if isinstance(value, dict):
        return {str(key): _to_json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_to_json_safe(item) for item in value]
    if isinstance(value, tuple):
        return [_to_json_safe(item) for item in value]
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, np.floating):
        return float(value)
    if isinstance(value, np.bool_):
        return bool(value)
    return value

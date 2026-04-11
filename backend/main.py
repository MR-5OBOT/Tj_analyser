from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import ValidationError

from backend.logging_utils import get_logger
from backend.models import (
    AnalyzeRequestForm,
    AnalyzeResponse,
    ExecutionReportRequest,
    ExecutionReportResponse,
)
from backend.settings import settings
from backend.files import cleanup_expired_reports, report_pdf_path
from config import CANONICAL_COLUMNS
from backend.service import (
    analyze_journal,
    generate_execution_report,
    load_dataframe_from_request,
    parse_optional_json,
)

logger = get_logger("backend.api")

app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description="Cloud backend for Android and web clients to upload journals and generate PDF reports.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    logger.info("health_check")
    return {"status": "ok"}


@app.get("/api/schema")
def schema() -> dict:
    logger.info("schema_request")
    return {"canonical_columns": CANONICAL_COLUMNS}


@app.post("/api/analyze")
async def analyze(
    report_type: str = Form("overall"),
    sheet_name: int = Form(0),
    file_url: str | None = Form(None),
    column_mappings: str | None = Form(None),
    outcome_map: str | None = Form(None),
    upload: UploadFile | None = File(None),
) -> AnalyzeResponse:
    try:
        logger.info(
            "analyze_request report_type=%s has_upload=%s has_url=%s sheet_name=%s",
            report_type,
            upload is not None,
            bool(file_url),
            sheet_name,
        )
        form = AnalyzeRequestForm(
            report_type=report_type,
            sheet_name=sheet_name,
            file_url=file_url,
            column_mappings=parse_optional_json(column_mappings),
            outcome_map=parse_optional_json(outcome_map),
        )
        raw_df = await load_dataframe_from_request(upload, file_url, sheet_name=sheet_name)
        response = analyze_journal(raw_df, form=form)
        logger.info("analyze_success report_id=%s rows=%s", response.report_id, response.rows_processed)
        return response
    except ValidationError as exc:
        logger.warning("analyze_validation_failed errors=%s", exc.errors())
        raise HTTPException(status_code=422, detail="Invalid analyze request.") from exc
    except ValueError as exc:
        logger.warning("analyze_user_error detail=%s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("analyze_unhandled_failure error=%s", exc)
        raise HTTPException(status_code=500, detail="Unexpected server error. Check backend logs.") from exc


@app.post("/api/execution-reports")
async def execution_report(payload: ExecutionReportRequest) -> ExecutionReportResponse:
    try:
        logger.info(
            "execution_report_request account=%s trade_count=%s report_date=%s",
            payload.account_name,
            len(payload.trades),
            payload.report_date,
        )
        response = generate_execution_report(payload)
        logger.info(
            "execution_report_success report_id=%s rows=%s",
            response.report_id,
            response.rows_processed,
        )
        return response
    except ValueError as exc:
        logger.warning("execution_report_user_error detail=%s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("execution_report_unhandled_failure error=%s", exc)
        raise HTTPException(status_code=500, detail="Unexpected server error. Check backend logs.") from exc


@app.get("/api/reports/{report_id}")
def download_report(report_id: str) -> FileResponse:
    cleanup_expired_reports()
    report_path = report_pdf_path(report_id)
    if not report_path.exists():
        logger.warning("report_not_found report_id=%s", report_id)
        raise HTTPException(status_code=404, detail="Report not found.")
    logger.info("report_download report_id=%s", report_id)
    return FileResponse(report_path, media_type="application/pdf", filename=report_path.name)

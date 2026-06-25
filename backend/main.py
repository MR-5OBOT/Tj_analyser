from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import ValidationError

from backend import jobs
from backend.logging_utils import get_logger
from backend.models import AnalyzeRequestForm
from backend.settings import settings
from backend.files import cleanup_expired_reports, report_pdf_path
from backend.service import (
    analyze_journal,
    load_dataframe_from_request,
    parse_optional_json,
)

logger = get_logger("backend.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    jobs.start_worker()  # single render worker — the one barista
    yield


app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description="Cloud backend for Android and web clients to upload journals and generate PDF reports.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict:
    return {"status": "ok", "health": "/api/health"}


@app.get("/api/health")
def health() -> dict:
    logger.info("health_check")
    return {"status": "ok"}


@app.post("/api/analyze")
async def analyze(
    sheet_name: int = Form(0),
    file_url: str | None = Form(None),
    column_mappings: str | None = Form(None),
    outcome_map: str | None = Form(None),
    upload: UploadFile | None = File(None),
) -> dict:
    """Validate + read the journal now (request scope), then hand the heavy render
    to the queue. Returns a job_id + place in line; the client polls /api/jobs."""
    try:
        logger.info(
            "analyze_request has_upload=%s has_url=%s sheet_name=%s",
            upload is not None,
            bool(file_url),
            sheet_name,
        )
        form = AnalyzeRequestForm(
            sheet_name=sheet_name,
            file_url=file_url,
            column_mappings=parse_optional_json(column_mappings),
            outcome_map=parse_optional_json(outcome_map),
        )
        # Read/parse the source while the request is alive (the upload is request-scoped).
        # The expensive normalize+render runs later in the worker.
        raw_df = await load_dataframe_from_request(upload, file_url, sheet_name=sheet_name)
    except ValidationError as exc:
        logger.warning("analyze_validation_failed errors=%s", exc.errors())
        raise HTTPException(status_code=422, detail="Invalid analyze request.") from exc
    except ValueError as exc:
        logger.warning("analyze_user_error detail=%s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    job_id = uuid4().hex

    def render() -> dict:
        return analyze_journal(raw_df, form=form).model_dump()

    try:
        position = jobs.submit(job_id, render)
    except RuntimeError:
        logger.warning("analyze_queue_full job_id=%s", job_id)
        raise HTTPException(status_code=503, detail="Server busy — too many reports queued. Try again in a minute.")
    logger.info("analyze_queued job_id=%s ahead=%s", job_id, position)
    return {"job_id": job_id, "state": "queued", "position": position}


@app.get("/api/jobs/{job_id}")
def job_status(job_id: str) -> dict:
    state = jobs.status(job_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Job not found (it may have expired).")
    return {"job_id": job_id, **state}


@app.get("/api/reports/{report_id}")
def download_report(report_id: str) -> FileResponse:
    cleanup_expired_reports()
    report_path = report_pdf_path(report_id)
    if not report_path.exists():
        logger.warning("report_not_found report_id=%s", report_id)
        raise HTTPException(status_code=404, detail="Report not found.")
    logger.info("report_download report_id=%s", report_id)
    return FileResponse(report_path, media_type="application/pdf", filename=report_path.name)

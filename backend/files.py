from datetime import datetime, timedelta, timezone
from pathlib import Path

from backend.settings import settings

REPORTS_DIR = settings.storage_dir / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def report_pdf_path(report_id: str) -> Path:
    return REPORTS_DIR / f"{report_id}.pdf"


def report_image_path(report_id: str) -> Path:
    return REPORTS_DIR / f"{report_id}.png"


def cleanup_expired_reports() -> None:
    """Delete generated report artifacts older than the configured TTL."""
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=settings.report_ttl_minutes)
    for pattern in ("*.pdf", "*.png"):
        for report_path in REPORTS_DIR.glob(pattern):
            modified_at = datetime.fromtimestamp(report_path.stat().st_mtime, tz=timezone.utc)
            if modified_at < cutoff:
                report_path.unlink(missing_ok=True)

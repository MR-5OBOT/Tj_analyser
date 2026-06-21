"""Normalize user-pasted spreadsheet links into direct, downloadable file URLs.

The mobile app lets the user paste any link to a journal. The most common case is a
Google Sheets share link copied straight from the browser, which is an HTML page, not a
file. This module rewrites those links into a direct CSV export so the backend can
download and parse them like any other file.
"""

import re
from urllib.parse import parse_qs, urlparse

from backend.logging_utils import get_logger

logger = get_logger("backend.url_utils")

_SHEETS_ID_RE = re.compile(r"/spreadsheets/d/(?:e/)?([a-zA-Z0-9-_]+)")
_GID_RE = re.compile(r"[#&?]gid=([0-9]+)")


def normalize_source_url(url: str | None) -> str | None:
    """Rewrite a spreadsheet share link to a direct-download URL when possible.

    Google Sheets ``/edit`` / ``/view`` links become a ``export?format=csv`` URL.
    Links that are already direct (``export``, ``pub?output=csv``, raw ``.csv``/``.xlsx``)
    and non-Google links are returned unchanged.
    """
    if not url:
        return url

    cleaned = url.strip()
    parsed = urlparse(cleaned)
    host = parsed.netloc.lower()

    if "docs.google.com" not in host or "/spreadsheets/" not in parsed.path:
        return cleaned

    # Already a direct export / published-CSV link: leave it alone.
    if "/export" in parsed.path or "output=csv" in parsed.query or "/pub" in parsed.path:
        return cleaned

    id_match = _SHEETS_ID_RE.search(parsed.path)
    if not id_match:
        logger.warning("sheets_url_no_id url=%s", cleaned)
        return cleaned

    sheet_id = id_match.group(1)
    gid = _extract_gid(cleaned, parsed.query)
    export_url = (
        f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}"
    )
    logger.info("sheets_url_normalized original=%s export=%s", cleaned, export_url)
    return export_url


def _extract_gid(url: str, query: str) -> str:
    """Find the sheet tab id (gid) in the query or fragment; default to the first tab."""
    query_gid = parse_qs(query).get("gid")
    if query_gid:
        return query_gid[0]

    fragment_match = _GID_RE.search(url)
    if fragment_match:
        return fragment_match.group(1)

    return "0"

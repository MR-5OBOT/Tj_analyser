from typing import Any

from pydantic import BaseModel, Field, HttpUrl


class AnalyzeRequestForm(BaseModel):
    report_type: str = "overall"
    sheet_name: int = 0
    file_url: HttpUrl | None = None
    column_mappings: dict[str, str] = Field(default_factory=dict)
    outcome_map: dict[str, str] = Field(default_factory=dict)


class AnalyzeResponse(BaseModel):
    report_id: str
    report_type: str
    stats: dict[str, Any]
    detected_mappings: dict[str, str]
    rows_processed: int
    download_url: str

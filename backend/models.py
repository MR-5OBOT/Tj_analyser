from typing import Any

from pydantic import BaseModel, Field, HttpUrl


class AnalyzeRequestForm(BaseModel):
    sheet_name: int = 0
    file_url: HttpUrl | None = None
    column_mappings: dict[str, str] = Field(default_factory=dict)
    outcome_map: dict[str, str] = Field(default_factory=dict)


class AnalyzeResponse(BaseModel):
    report_id: str
    stats: dict[str, Any]
    detected_mappings: dict[str, str]
    source_columns: list[str] = Field(default_factory=list)
    unmapped_columns: list[str] = Field(default_factory=list)
    rows_processed: int
    download_url: str

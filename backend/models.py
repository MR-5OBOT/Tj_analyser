from datetime import date
from typing import Any, Literal

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


class ExecutionTrade(BaseModel):
    asset: str = ""
    side: Literal["long", "short"] = "long"
    entry_time: str = ""
    exit_time: str = ""
    setup: str = ""
    notes: str = ""
    size: float | None = None
    risk_amount: float | None = None
    entry_price: float | None = None
    exit_price: float | None = None
    pnl_amount: float | None = None
    rr: float | None = None


class ExecutionReportRequest(BaseModel):
    report_date: date
    title: str = "Daily Execution Report"
    account_name: str = ""
    account_cycle: str = ""
    account_type: str = ""
    platform: str = ""
    session: str = ""
    base_currency: str = "USD"
    opening_balance: float | None = None
    closing_balance: float | None = None
    daily_risk_limit: float | None = None
    notes: str = ""
    trades: list[ExecutionTrade] = Field(default_factory=list)


class ExecutionReportResponse(BaseModel):
    report_id: str
    report_type: str
    stats: dict[str, Any]
    rows_processed: int
    download_url: str

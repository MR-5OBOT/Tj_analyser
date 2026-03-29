from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class BackendSettings(BaseSettings):
    api_title: str = "TJ Analyser Cloud API"
    api_version: str = "0.1.0"
    allow_origins: list[str] = Field(default_factory=lambda: ["*"])
    storage_dir: Path = Path("backend/storage")
    request_timeout_seconds: float = 60.0
    report_ttl_minutes: int = 60

    model_config = SettingsConfigDict(
        env_prefix="TJ_",
        env_file=".env",
        env_file_encoding="utf-8",
    )


settings = BackendSettings()

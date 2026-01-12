from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Literal
from functools import lru_cache


class ProbeSettings(BaseSettings):
    # Probe identity
    probe_id: str = Field(..., description="Unique probe identifier")
    probe_region: str = Field(..., description="Geographic region code")

    # Central API
    central_api_url: str = Field(..., description="Central API endpoint")
    api_key: str = Field(..., description="API key for authentication")

    # Redis
    redis_url: str = Field(default="redis://localhost:6379/0")

    # Scheduling
    test_interval_minutes: int = Field(default=60, ge=30, le=180)
    max_concurrent_tests: int = Field(default=3, ge=1, le=10)

    # Rate limiting
    requests_per_minute: int = Field(default=10)
    jitter_seconds: int = Field(default=30, description="Random delay to avoid patterns")

    # Timeouts
    vpn_connect_timeout: int = Field(default=30)
    ping_timeout: int = Field(default=10)
    streaming_check_timeout: int = Field(default=60)

    # Logging
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    sentry_dsn: str | None = None

    # Paths
    credentials_path: str = Field(default="/app/credentials")
    config_path: str = Field(default="/app/config")

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> ProbeSettings:
    return ProbeSettings()

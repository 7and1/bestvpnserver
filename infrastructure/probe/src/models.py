from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal
from enum import Enum


class VPNProtocol(str, Enum):
    OPENVPN = "openvpn"
    WIREGUARD = "wireguard"


class TestStatus(str, Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    TIMEOUT = "timeout"
    BLOCKED = "blocked"
    SKIPPED = "skipped"


class StreamingService(str, Enum):
    NETFLIX = "netflix"
    DISNEY_PLUS = "disney_plus"
    HULU = "hulu"
    BBC_IPLAYER = "bbc_iplayer"
    AMAZON_PRIME = "amazon_prime"
    HBO_MAX = "hbo_max"


class VPNServer(BaseModel):
    id: str
    provider: str
    name: str
    hostname: str
    ip_address: str | None = None
    country: str
    city: str | None = None
    protocol: VPNProtocol
    port: int
    credentials_ref: str  # Reference to credential in vault


class PingResult(BaseModel):
    latency_ms: float | None
    packet_loss: float
    status: TestStatus
    error: str | None = None


class StreamingResult(BaseModel):
    service: StreamingService
    accessible: bool
    status: TestStatus
    response_time_ms: float | None = None
    detected_region: str | None = None
    error: str | None = None


class SpeedTestResult(BaseModel):
    download_mbps: float | None
    upload_mbps: float | None
    status: TestStatus
    error: str | None = None


class TestResult(BaseModel):
    id: str = Field(default_factory=lambda: str(__import__('uuid').uuid4()))
    probe_id: str
    probe_region: str
    server_id: str
    provider: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    # Connection
    vpn_connected: bool
    vpn_connect_time_ms: float | None = None
    assigned_ip: str | None = None

    # Tests
    ping: PingResult | None = None
    streaming: list[StreamingResult] = []
    speed: SpeedTestResult | None = None

    # Metadata
    protocol: VPNProtocol
    error: str | None = None


class ProbeHealth(BaseModel):
    probe_id: str
    region: str
    status: Literal["healthy", "degraded", "unhealthy"]
    uptime_seconds: float
    last_test_at: datetime | None
    tests_completed_24h: int
    tests_failed_24h: int
    cpu_percent: float
    memory_percent: float
    disk_percent: float
    vpn_success_rate: float

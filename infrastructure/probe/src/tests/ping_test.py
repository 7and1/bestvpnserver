import asyncio
import subprocess
import re

import structlog

from ..models import PingResult, TestStatus
from ..config import get_settings

logger = structlog.get_logger()


class PingTester:
    """Performs ping latency tests"""

    TARGETS = [
        "1.1.1.1",           # Cloudflare
        "8.8.8.8",           # Google
        "208.67.222.222",    # OpenDNS
    ]

    def __init__(self):
        self.settings = get_settings()

    async def run(self, target: str | None = None) -> PingResult:
        """Run ping test to target or default targets"""
        targets = [target] if target else self.TARGETS
        results = []

        for t in targets:
            result = await self._ping_host(t)
            results.append(result)

        # Aggregate results
        successful = [r for r in results if r.status == TestStatus.SUCCESS]

        if not successful:
            return PingResult(
                latency_ms=None,
                packet_loss=100.0,
                status=TestStatus.FAILURE,
                error="All ping targets failed"
            )

        avg_latency = sum(r.latency_ms for r in successful) / len(successful)
        avg_loss = sum(r.packet_loss for r in results) / len(results)

        return PingResult(
            latency_ms=round(avg_latency, 2),
            packet_loss=round(avg_loss, 2),
            status=TestStatus.SUCCESS
        )

    async def _ping_host(self, host: str) -> PingResult:
        """Ping a single host"""
        try:
            cmd = ["ping", "-c", "5", "-W", str(self.settings.ping_timeout), host]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=self.settings.ping_timeout + 5
            )

            output = stdout.decode()

            # Parse latency
            latency_match = re.search(r"avg[^=]*=\s*[\d.]+/([\d.]+)/", output)
            latency = float(latency_match.group(1)) if latency_match else None

            # Parse packet loss
            loss_match = re.search(r"(\d+(?:\.\d+)?)\s*%\s*packet loss", output)
            packet_loss = float(loss_match.group(1)) if loss_match else 0.0

            if latency is not None:
                return PingResult(
                    latency_ms=latency,
                    packet_loss=packet_loss,
                    status=TestStatus.SUCCESS
                )
            else:
                return PingResult(
                    latency_ms=None,
                    packet_loss=100.0,
                    status=TestStatus.FAILURE,
                    error="Could not parse ping response"
                )

        except asyncio.TimeoutError:
            return PingResult(
                latency_ms=None,
                packet_loss=100.0,
                status=TestStatus.TIMEOUT,
                error=f"Ping timeout after {self.settings.ping_timeout}s"
            )
        except Exception as e:
            logger.error("ping_error", host=host, error=str(e))
            return PingResult(
                latency_ms=None,
                packet_loss=100.0,
                status=TestStatus.FAILURE,
                error=str(e)
            )

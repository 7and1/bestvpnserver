import asyncio
import subprocess
import re
import tempfile
import os
from pathlib import Path
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog

from .models import VPNServer, VPNProtocol
from .config import get_settings

logger = structlog.get_logger()


class VPNConnectionError(Exception):
    """VPN connection failed"""
    pass


class VPNManager:
    """Manages VPN connections via OpenVPN and WireGuard CLI"""

    def __init__(self):
        self.settings = get_settings()
        self._current_process: subprocess.Popen | None = None
        self._original_dns: list[str] = []

    async def _get_credentials(self, credentials_ref: str) -> dict:
        """Fetch credentials from secure storage"""
        # In production, fetch from HashiCorp Vault or AWS Secrets Manager
        creds_file = Path(self.settings.credentials_path) / f"{credentials_ref}.json"
        if creds_file.exists():
            import json
            return json.loads(creds_file.read_text())
        raise VPNConnectionError(f"Credentials not found: {credentials_ref}")

    async def _write_openvpn_config(self, server: VPNServer, creds: dict) -> Path:
        """Generate OpenVPN config file"""
        config = f"""
client
dev tun
proto udp
remote {server.hostname} {server.port}
resolv-retry infinite
nobind
persist-key
persist-tun
remote-cert-tls server
cipher AES-256-GCM
auth SHA256
verb 3
auth-user-pass /tmp/ovpn_auth.txt
"""
        if "ca_cert" in creds:
            config += f"\n<ca>\n{creds['ca_cert']}\n</ca>\n"

        config_path = Path(tempfile.mktemp(suffix=".ovpn"))
        config_path.write_text(config)

        # Write auth file
        auth_path = Path("/tmp/ovpn_auth.txt")
        auth_path.write_text(f"{creds['username']}\n{creds['password']}\n")
        auth_path.chmod(0o600)

        return config_path

    async def _write_wireguard_config(self, server: VPNServer, creds: dict) -> Path:
        """Generate WireGuard config file"""
        config = f"""
[Interface]
PrivateKey = {creds['private_key']}
Address = {creds.get('address', '10.0.0.2/32')}
DNS = {creds.get('dns', '1.1.1.1')}

[Peer]
PublicKey = {creds['server_public_key']}
Endpoint = {server.hostname}:{server.port}
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
"""
        config_path = Path(f"/tmp/wg_{server.id}.conf")
        config_path.write_text(config)
        config_path.chmod(0o600)
        return config_path

    async def _connect_openvpn(self, config_path: Path, timeout: int) -> str:
        """Connect using OpenVPN"""
        cmd = ["openvpn", "--config", str(config_path), "--daemon", "--log", "/tmp/openvpn.log"]

        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        self._current_process = process

        # Wait for connection
        start_time = asyncio.get_event_loop().time()
        while asyncio.get_event_loop().time() - start_time < timeout:
            await asyncio.sleep(1)

            # Check log for connection success
            log_path = Path("/tmp/openvpn.log")
            if log_path.exists():
                log_content = log_path.read_text()
                if "Initialization Sequence Completed" in log_content:
                    # Extract assigned IP
                    ip_match = re.search(r"ifconfig\s+(\d+\.\d+\.\d+\.\d+)", log_content)
                    return ip_match.group(1) if ip_match else await self._get_vpn_ip()
                if "AUTH_FAILED" in log_content:
                    raise VPNConnectionError("Authentication failed")

        raise VPNConnectionError(f"OpenVPN connection timeout after {timeout}s")

    async def _connect_wireguard(self, config_path: Path, timeout: int) -> str:
        """Connect using WireGuard"""
        interface = config_path.stem

        # Bring up interface
        result = subprocess.run(
            ["wg-quick", "up", str(config_path)],
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            raise VPNConnectionError(f"WireGuard failed: {result.stderr}")

        # Verify connection
        await asyncio.sleep(2)
        return await self._get_vpn_ip()

    async def _get_vpn_ip(self) -> str:
        """Get current public IP through VPN"""
        try:
            result = subprocess.run(
                ["curl", "-s", "--max-time", "10", "https://api.ipify.org"],
                capture_output=True,
                text=True
            )
            return result.stdout.strip()
        except Exception:
            return "unknown"

    async def _disconnect_openvpn(self):
        """Disconnect OpenVPN"""
        subprocess.run(["pkill", "-SIGTERM", "openvpn"], capture_output=True)
        await asyncio.sleep(2)
        subprocess.run(["pkill", "-SIGKILL", "openvpn"], capture_output=True)

    async def _disconnect_wireguard(self, interface: str):
        """Disconnect WireGuard"""
        subprocess.run(["wg-quick", "down", interface], capture_output=True)

    @asynccontextmanager
    async def connect(self, server: VPNServer) -> AsyncGenerator[str, None]:
        """Context manager for VPN connection"""
        config_path = None
        assigned_ip = None

        try:
            logger.info("connecting_vpn", server=server.hostname, protocol=server.protocol)

            creds = await self._get_credentials(server.credentials_ref)

            if server.protocol == VPNProtocol.OPENVPN:
                config_path = await self._write_openvpn_config(server, creds)
                assigned_ip = await self._connect_openvpn(
                    config_path,
                    self.settings.vpn_connect_timeout
                )
            else:
                config_path = await self._write_wireguard_config(server, creds)
                assigned_ip = await self._connect_wireguard(
                    config_path,
                    self.settings.vpn_connect_timeout
                )

            logger.info("vpn_connected", ip=assigned_ip, server=server.hostname)
            yield assigned_ip

        finally:
            # Always disconnect
            logger.info("disconnecting_vpn", server=server.hostname)

            if server.protocol == VPNProtocol.OPENVPN:
                await self._disconnect_openvpn()
            else:
                await self._disconnect_wireguard(f"wg_{server.id}")

            # Cleanup temp files
            if config_path and config_path.exists():
                config_path.unlink()

            for tmp_file in ["/tmp/ovpn_auth.txt", "/tmp/openvpn.log"]:
                p = Path(tmp_file)
                if p.exists():
                    p.unlink()

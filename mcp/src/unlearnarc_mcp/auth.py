"""
Manages the admin JWT token.

Reads ADMIN_EMAIL and ADMIN_PASSWORD from environment, calls the Java app's
/api/v1/auth/login endpoint, and caches the token.  Re-authenticates
automatically when a 401 is returned.

Never touches the database directly — validation lives in the Java service layer.
"""

from __future__ import annotations

import os
import time
import threading
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


class TokenManager:
    """Thread-safe JWT token manager with auto-refresh."""

    def __init__(self, base_url: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._token: Optional[str] = None
        self._expires_at: float = 0.0
        self._lock = threading.Lock()

    # ── public ─────────────────────────────────────────────────────────────────

    def token(self) -> str:
        """Return a valid access token, refreshing if needed."""
        with self._lock:
            if self._token and time.time() < self._expires_at - 60:
                return self._token
            self._authenticate()
            assert self._token is not None
            return self._token

    def invalidate(self) -> None:
        """Force re-authentication on the next call (e.g. after a 401)."""
        with self._lock:
            self._token = None
            self._expires_at = 0.0

    # ── private ────────────────────────────────────────────────────────────────

    def _authenticate(self) -> None:
        email = os.environ.get("ADMIN_EMAIL", "")
        password = os.environ.get("ADMIN_PASSWORD", "")

        if not email or not password:
            raise RuntimeError(
                "ADMIN_EMAIL and ADMIN_PASSWORD must be set in the environment."
            )

        url = f"{self._base_url}/api/v1/auth/login"
        logger.info("[mcp-auth] Authenticating as admin …")

        try:
            resp = httpx.post(
                url,
                json={"email": email, "password": password},
                timeout=10.0,
            )
        except httpx.ConnectError as exc:
            raise RuntimeError(
                f"Cannot reach the Java backend at {self._base_url}. "
                "Is the server running?"
            ) from exc

        if resp.status_code != 200:
            body = resp.text[:300]
            raise RuntimeError(
                f"Admin login failed (HTTP {resp.status_code}): {body}"
            )

        payload = resp.json()
        data = payload.get("data") or payload  # unwrap ApiResponse wrapper
        self._token = data["accessToken"]
        expires_in_s = data.get("expiresIn", 86400)  # default 24 h
        self._expires_at = time.time() + expires_in_s
        logger.info("[mcp-auth] Token acquired, valid for %d s", expires_in_s)

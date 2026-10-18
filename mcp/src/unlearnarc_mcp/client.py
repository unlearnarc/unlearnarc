"""
Thin HTTP client that wraps every call to the UnlearnArc Java API.

* Automatically injects Bearer token (via TokenManager).
* On 401 it invalidates the cached token and retries once.
* Raises descriptive RuntimeError on HTTP errors so MCP tool handlers
  can surface the message cleanly to the agent.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from .auth import TokenManager

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0)


class ApiClient:
    def __init__(self, base_url: str, token_manager: TokenManager) -> None:
        self._base = base_url.rstrip("/")
        self._tm = token_manager

    # ── HTTP helpers ────────────────────────────────────────────────────────────

    def get(self, path: str, **params: Any) -> Any:
        return self._request("GET", path, params=params or None)

    def post(self, path: str, body: dict) -> Any:
        return self._request("POST", path, json=body)

    def put(self, path: str, body: dict) -> Any:
        return self._request("PUT", path, json=body)

    def delete(self, path: str) -> Any:
        return self._request("DELETE", path)

    # ── internal ────────────────────────────────────────────────────────────────

    def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        url = f"{self._base}{path}"
        retried = False

        while True:
            token = self._tm.token()
            headers = {"Authorization": f"Bearer {token}"}
            logger.debug("[api] %s %s", method, path)

            try:
                resp = httpx.request(
                    method, url, headers=headers, timeout=_TIMEOUT, **kwargs
                )
            except httpx.ConnectError as exc:
                raise RuntimeError(
                    f"Cannot reach Java backend ({url}). Is the server running?"
                ) from exc

            if resp.status_code == 401 and not retried:
                logger.warning("[api] 401 — re-authenticating")
                self._tm.invalidate()
                retried = True
                continue

            if not resp.is_success:
                body = resp.text[:400]
                raise RuntimeError(
                    f"API error {resp.status_code} on {method} {path}: {body}"
                )

            # 204 No Content
            if resp.status_code == 204 or not resp.content:
                return None

            payload = resp.json()
            # Unwrap UnlearnArc's standard ApiResponse wrapper when present
            if isinstance(payload, dict) and "data" in payload:
                return payload["data"]
            return payload

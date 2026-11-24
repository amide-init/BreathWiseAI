"""Reusable outbound HTTP client factory with bounded timeouts."""

from __future__ import annotations

import httpx

from app.config.settings import get_settings


def create_http_client(*, timeout_seconds: float | None = None) -> httpx.Client:
    """Create a bounded synchronous httpx client for external API adapters."""
    settings = get_settings()
    timeout = timeout_seconds if timeout_seconds is not None else settings.http_timeout_seconds
    return httpx.Client(
        timeout=httpx.Timeout(timeout),
        headers={"User-Agent": f"{settings.service_name}/{settings.api_version}"},
        follow_redirects=True,
    )

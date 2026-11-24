"""Server-side secret definitions (Google Cloud Secret Manager / env fallback).

Never expose these values in client code or logs.
"""

from __future__ import annotations

import os
from typing import Final

GEMINI_API_KEY_ENV: Final[str] = "GEMINI_API_KEY"
WAQI_API_TOKEN_ENV: Final[str] = "WAQI_API_TOKEN"
CPCB_API_KEY_ENV: Final[str] = "CPCB_API_KEY"
GOOGLE_MAPS_SERVER_KEY_ENV: Final[str] = "GOOGLE_MAPS_SERVER_KEY"


def get_optional_secret(name: str) -> str | None:
    """Read a server-side secret from environment (populated by Secret Manager in Cloud Run)."""
    value = os.getenv(name)
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None

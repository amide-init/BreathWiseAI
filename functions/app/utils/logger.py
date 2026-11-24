"""Structured PII-safe JSON logging helpers (PRD §12 Privacy)."""

from __future__ import annotations

import json
import logging
from typing import Any

_REDACTED_KEYS = frozenset(
    {
        "authorization",
        "token",
        "id_token",
        "password",
        "email",
        "name",
        "nickname",
        "display_name",
        "displayName",
        "health",
        "notes",
        "optionalHealthProfile",
        "optional_health_profile",
        "api_key",
        "secret",
    }
)


def _sanitize_value(key: str, value: Any) -> Any:
    lowered = key.lower()
    if key in _REDACTED_KEYS or any(
        sensitive in lowered for sensitive in ("token", "secret", "password", "health", "email")
    ):
        return "[REDACTED]"
    if isinstance(value, dict):
        return {k: _sanitize_value(k, v) for k, v in value.items()}
    return value


def get_logger(name: str = "breathewise") -> logging.Logger:
    """Return configured logger outputting single-line structured JSON."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(message)s"))
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger


def log_event(event: str, *, level: int = logging.INFO, **fields: Any) -> None:
    """Emit a structured JSON log line with automatic PII redaction."""
    safe_payload = {"event": event, **{k: _sanitize_value(k, v) for k, v in fields.items()}}
    get_logger().log(level, json.dumps(safe_payload, default=str))

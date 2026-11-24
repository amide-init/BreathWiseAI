"""Unit tests for router dispatch, health endpoint, auth extraction, and PII redaction."""

from __future__ import annotations

import json
from types import SimpleNamespace

import pytest

from app.routes.router import dispatch_request
from app.utils.auth import extract_bearer_token
from app.utils.errors import AuthenticationError
from app.utils.logger import _sanitize_value


def test_health_route_returns_200_envelope() -> None:
    req = SimpleNamespace(method="GET", path="/api/v1/health", headers={})
    resp = dispatch_request(req)
    assert resp.status_code == 200
    payload = json.loads(resp.get_data(as_text=True))
    assert payload["status"] == "ok"
    assert payload["service"] == "breathewise-ai-api"
    assert "timestamp" in payload


def test_unknown_route_returns_standard_404_envelope() -> None:
    req = SimpleNamespace(method="GET", path="/api/v1/does-not-exist", headers={})
    resp = dispatch_request(req)
    assert resp.status_code == 404
    payload = json.loads(resp.get_data(as_text=True))
    assert payload["error"]["code"] == "NOT_FOUND"
    assert payload["error"]["requestId"].startswith("req_")


def test_extract_bearer_token_valid_and_invalid() -> None:
    assert extract_bearer_token("Bearer abc.def.ghi") == "abc.def.ghi"
    with pytest.raises(AuthenticationError):
        extract_bearer_token(None)
    with pytest.raises(AuthenticationError):
        extract_bearer_token("Basic xyz")


def test_logger_redacts_sensitive_pii_fields() -> None:
    sanitized = _sanitize_value(
        "payload",
        {
            "email": "parent@example.com",
            "optionalHealthProfile": {"notes": "mild asthma"},
            "aqi": 342,
        },
    )
    assert sanitized["email"] == "[REDACTED]"
    assert sanitized["optionalHealthProfile"] == "[REDACTED]"
    assert sanitized["aqi"] == 342

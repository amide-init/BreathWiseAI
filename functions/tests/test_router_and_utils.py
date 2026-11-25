"""Unit tests for Firebase on_call wrapper, auth verification, error mapping, and PII redaction."""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from firebase_functions import https_fn

from app.routes.health_routes import handle_health
from app.utils.auth import extract_bearer_token
from app.utils.callable_utils import require_callable_auth, run_callable
from app.utils.errors import AuthenticationError, ValidationError
from app.utils.logger import _sanitize_value


def test_health_callable_returns_serialized_dict() -> None:
    req = SimpleNamespace(auth=None, data={})
    payload = run_callable("health_check", req, handle_health, require_auth=False)
    assert payload["status"] == "ok"
    assert payload["service"] == "breathewise-ai-api"
    assert "timestamp" in payload


def test_authenticated_callable_rejects_missing_auth() -> None:
    req = SimpleNamespace(auth=None, data={})
    with pytest.raises(https_fn.HttpsError) as exc_info:
        run_callable("protected_fn", req, lambda _r: {"ok": True}, require_auth=True)
    assert exc_info.value.code == https_fn.FunctionsErrorCode.UNAUTHENTICATED


def test_authenticated_callable_extracts_verified_uid() -> None:
    req = SimpleNamespace(
        auth=SimpleNamespace(uid="user_123", token={"email": "parent@example.com"}),
        data={},
    )
    user = require_callable_auth(req)
    assert user.uid == "user_123"
    assert user.email == "parent@example.com"


def test_app_error_maps_to_typed_https_error() -> None:
    req = SimpleNamespace(auth=SimpleNamespace(uid="user_123", token={}), data={})

    def _bad_handler(_r: object) -> None:
        raise ValidationError("Invalid locationId")

    with pytest.raises(https_fn.HttpsError) as exc_info:
        run_callable("get_air_quality", req, _bad_handler, require_auth=True)
    assert exc_info.value.code == https_fn.FunctionsErrorCode.INVALID_ARGUMENT
    assert "Invalid locationId" in exc_info.value.message


def test_extract_bearer_token_valid_and_invalid() -> None:
    assert extract_bearer_token("Bearer abc.def.ghi") == "abc.def.ghi"
    with pytest.raises(AuthenticationError):
        extract_bearer_token(None)


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

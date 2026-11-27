"""Reusable Firebase Callable (`@https_fn.on_call`) helpers.

Centralizes auth enforcement (`req.auth.uid`), Pydantic model serialization,
AppError -> HttpsError mapping, and PII-safe structured metadata logging so
every callable endpoint stays thin and DRY.
"""

from __future__ import annotations

import logging
import time
import uuid
from collections.abc import Callable
from typing import Any

from firebase_functions import https_fn
from pydantic import BaseModel
from pydantic import ValidationError as PydanticValidationError

from app.utils.auth import AuthenticatedUser
from app.utils.errors import AppError
from app.utils.logger import log_event

_ERROR_CODE_MAP: dict[str, https_fn.FunctionsErrorCode] = {
    "UNAUTHENTICATED": https_fn.FunctionsErrorCode.UNAUTHENTICATED,
    "PERMISSION_DENIED": https_fn.FunctionsErrorCode.PERMISSION_DENIED,
    "INVALID_ARGUMENT": https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
    "NOT_FOUND": https_fn.FunctionsErrorCode.NOT_FOUND,
    "RATE_LIMITED": https_fn.FunctionsErrorCode.RESOURCE_EXHAUSTED,
    "UPSTREAM_ERROR": https_fn.FunctionsErrorCode.UNAVAILABLE,
    "INTERNAL_ERROR": https_fn.FunctionsErrorCode.INTERNAL,
}


def require_callable_auth(req: https_fn.CallableRequest[Any]) -> AuthenticatedUser:
    """Verify Firebase Callable auth context and return authoritative UID."""
    auth_ctx = getattr(req, "auth", None)
    uid = getattr(auth_ctx, "uid", None) if auth_ctx is not None else None
    if not isinstance(uid, str) or not uid:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            message="Authentication required. Please sign in to continue.",
        )
    token_claims = getattr(auth_ctx, "token", None)
    email = token_claims.get("email") if isinstance(token_claims, dict) else None
    return AuthenticatedUser(uid=uid, email=email if isinstance(email, str) else None)


def get_callable_data(req: https_fn.CallableRequest[Any]) -> dict[str, Any]:
    """Safely extract callable `req.data` as a dict."""
    raw = getattr(req, "data", None)
    if raw is None:
        return {}
    if not isinstance(raw, dict):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Callable payload must be a JSON object.",
        )
    return raw


def run_callable(
    name: str,
    req: https_fn.CallableRequest[Any],
    handler: Callable[[https_fn.CallableRequest[Any]], Any],
    *,
    require_auth: bool = True,
    rate_limit_bucket: str | None = None,
) -> Any:
    """Execute a callable handler with unified auth, per-user rate limits, and latency logging."""
    request_id = f"req_{uuid.uuid4().hex[:12]}"
    started = time.perf_counter()

    try:
        auth_user: AuthenticatedUser | None = None
        if require_auth:
            auth_user = require_callable_auth(req)

        if rate_limit_bucket and auth_user is not None:
            from app.services.usage_service import UsageService

            UsageService().consume(user_id=auth_user.uid, bucket=rate_limit_bucket)

        result = handler(req)
        payload = result.model_dump(by_alias=True) if isinstance(result, BaseModel) else result
        latency_ms = round((time.perf_counter() - started) * 1000, 2)
        log_event(
            "callable_completed",
            callable=name,
            request_id=request_id,
            latency_ms=latency_ms,
        )
        return payload

    except https_fn.HttpsError:
        raise

    except AppError as exc:
        latency_ms = round((time.perf_counter() - started) * 1000, 2)
        log_event(
            "callable_app_error",
            level=logging.WARNING,
            callable=name,
            request_id=request_id,
            code=exc.code,
            latency_ms=latency_ms,
        )
        fn_code = _ERROR_CODE_MAP.get(exc.code, https_fn.FunctionsErrorCode.INTERNAL)
        raise https_fn.HttpsError(
            code=fn_code,
            message=exc.message,
            details={"code": exc.code, "requestId": request_id},
        ) from exc

    except PydanticValidationError as exc:
        latency_ms = round((time.perf_counter() - started) * 1000, 2)
        log_event(
            "callable_validation_error",
            level=logging.WARNING,
            callable=name,
            request_id=request_id,
            error_count=len(exc.errors()),
            latency_ms=latency_ms,
        )
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Request validation failed. Check required fields and value ranges.",
            details={"code": "INVALID_ARGUMENT", "requestId": request_id},
        ) from exc

    except Exception as exc:  # noqa: BLE001 - Prevent internal stack traces from leaking
        latency_ms = round((time.perf_counter() - started) * 1000, 2)
        log_event(
            "callable_unhandled_error",
            level=logging.ERROR,
            callable=name,
            request_id=request_id,
            latency_ms=latency_ms,
        )
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message="An unexpected server error occurred.",
            details={"code": "INTERNAL_ERROR", "requestId": request_id},
        ) from exc

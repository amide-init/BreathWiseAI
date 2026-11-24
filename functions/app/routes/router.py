"""Central HTTP request router with unified error mapping and PII-safe request logging."""

from __future__ import annotations

import logging
import time
import uuid
from collections.abc import Callable
from typing import Any

from firebase_functions import https_fn
from pydantic import ValidationError as PydanticValidationError

from app.routes.health_routes import handle_health
from app.utils.errors import AppError, NotFoundError
from app.utils.logger import log_event
from app.utils.responses import error_response, ok_response

RouteHandler = Callable[[Any], Any]


def _normalize_path(raw_path: str | None) -> str:
    path = (raw_path or "/").strip()
    if not path.startswith("/"):
        path = f"/{path}"
    if len(path) > 1 and path.endswith("/"):
        path = path[:-1]
    return path


_ROUTES: dict[tuple[str, str], RouteHandler] = {
    ("GET", "/api/v1/health"): handle_health,
    ("GET", "/v1/health"): handle_health,
    ("GET", "/health"): handle_health,
}


def dispatch_request(req: Any) -> https_fn.Response:
    """Route incoming HTTPS request, catch typed errors, and emit structured metadata logs."""
    request_id = f"req_{uuid.uuid4().hex[:12]}"
    started = time.perf_counter()
    method = str(getattr(req, "method", "GET")).upper()
    path = _normalize_path(getattr(req, "path", "/"))

    try:
        handler = _ROUTES.get((method, path))
        if handler is None:
            raise NotFoundError(f"Route {method} {path} not found.")

        result = handler(req)
        response = (
            result
            if isinstance(result, https_fn.Response)
            else ok_response(result, request_id=request_id)
        )
        latency_ms = round((time.perf_counter() - started) * 1000, 2)
        log_event(
            "http_request_completed",
            request_id=request_id,
            method=method,
            path=path,
            status=response.status_code,
            latency_ms=latency_ms,
        )
        return response

    except AppError as exc:
        latency_ms = round((time.perf_counter() - started) * 1000, 2)
        log_event(
            "http_request_app_error",
            level=logging.WARNING,
            request_id=request_id,
            method=method,
            path=path,
            code=exc.code,
            status=exc.status_code,
            latency_ms=latency_ms,
        )
        return error_response(
            code=exc.code,
            message=exc.message,
            status=exc.status_code,
            request_id=request_id,
        )

    except PydanticValidationError as exc:
        latency_ms = round((time.perf_counter() - started) * 1000, 2)
        log_event(
            "http_request_validation_error",
            level=logging.WARNING,
            request_id=request_id,
            method=method,
            path=path,
            error_count=len(exc.errors()),
            latency_ms=latency_ms,
        )
        return error_response(
            code="INVALID_ARGUMENT",
            message="Request validation failed. Check required fields and value ranges.",
            status=400,
            request_id=request_id,
        )

    except Exception:  # noqa: BLE001 - Catch-all boundary prevents stack-trace leaks
        latency_ms = round((time.perf_counter() - started) * 1000, 2)
        log_event(
            "http_request_unhandled_error",
            level=logging.ERROR,
            request_id=request_id,
            method=method,
            path=path,
            latency_ms=latency_ms,
        )
        return error_response(
            code="INTERNAL_ERROR",
            message="An unexpected server error occurred.",
            status=500,
            request_id=request_id,
        )

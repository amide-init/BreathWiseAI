"""Standardized HTTP JSON response builders for Cloud Functions routes."""

from __future__ import annotations

import json
from typing import Any

from firebase_functions import https_fn
from pydantic import BaseModel


def _serialize_payload(payload: Any) -> str:
    if isinstance(payload, BaseModel):
        return payload.model_dump_json(by_alias=True)
    return json.dumps(payload, default=str)


def ok_response(
    payload: Any, *, status: int = 200, request_id: str | None = None
) -> https_fn.Response:
    """Build a JSON success response with optional X-Request-Id header."""
    headers = {"Content-Type": "application/json; charset=utf-8"}
    if request_id:
        headers["X-Request-Id"] = request_id
    return https_fn.Response(
        response=_serialize_payload(payload),
        status=status,
        headers=headers,
    )


def error_response(
    *,
    code: str,
    message: str,
    status: int,
    request_id: str,
) -> https_fn.Response:
    """Build a standard error JSON envelope matching docs/API_SPEC.md."""
    body = {
        "error": {
            "code": code,
            "message": message,
            "requestId": request_id,
        }
    }
    return https_fn.Response(
        response=json.dumps(body),
        status=status,
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "X-Request-Id": request_id,
        },
    )

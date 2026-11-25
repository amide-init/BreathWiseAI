"""Firebase Cloud Functions Gen 2 Callable (`on_call`) entrypoints for BreatheWise AI.

Keep this file strictly as a thin bootstrapper. All business logic, providers,
repositories, deterministic domain rules, and LangGraph orchestration live
inside `app/`.
"""

from __future__ import annotations

from typing import Any

from firebase_functions import https_fn, options

from app.config.settings import get_settings
from app.repositories.base_repo import ensure_firebase_app
from app.routes.air_quality_routes import handle_get_air_quality_callable
from app.routes.chat_routes import handle_send_chat_message_callable
from app.routes.health_routes import handle_health
from app.routes.impact_routes import (
    handle_delete_impact_action_callable,
    handle_get_impact_summary_callable,
    handle_log_impact_action_callable,
)
from app.routes.indoor_routes import handle_assess_indoor_air_callable
from app.routes.location_routes import handle_location_search_callable
from app.routes.planner_routes import handle_generate_daily_plan_callable
from app.routes.translation_routes import handle_translate_texts_callable
from app.utils.callable_utils import run_callable

_settings = get_settings()
# Required at import time so firebase-functions' built-in on_call token verifier
# has an initialized default firebase_admin app before any handler runs.
ensure_firebase_app()


@https_fn.on_call(
    region=_settings.region,
    memory=options.MemoryOption.MB_256,
    timeout_sec=30,
)
def health_check(req: https_fn.CallableRequest[Any]) -> Any:
    """Public callable health check for operational verification."""
    return run_callable("health_check", req, handle_health, require_auth=False)


@https_fn.on_call(
    region=_settings.region,
    memory=options.MemoryOption.MB_512,
    timeout_sec=30,
)
def search_locations(req: https_fn.CallableRequest[Any]) -> Any:
    """Public cache-backed callable returning normalized matching city locations (FR-02)."""
    return run_callable(
        "search_locations", req, handle_location_search_callable, require_auth=False
    )


@https_fn.on_call(
    region=_settings.region,
    memory=options.MemoryOption.MB_512,
    timeout_sec=60,
    secrets=["WAQI_API_TOKEN"],
)
def get_air_quality(req: https_fn.CallableRequest[Any]) -> Any:
    """Public cache-first callable returning CPCB NAQI, weather, forecasts & quick verdicts (FR-03/04)."""
    return run_callable("get_air_quality", req, handle_get_air_quality_callable, require_auth=False)


@https_fn.on_call(
    region=_settings.region,
    memory=options.MemoryOption.MB_512,
    timeout_sec=60,
    secrets=["GEMINI_API_KEY", "WAQI_API_TOKEN"],
)
def generate_daily_plan(req: https_fn.CallableRequest[Any]) -> Any:
    """Authenticated callable running the 5-node LangGraph Daily Planner (FR-06)."""
    return run_callable(
        "generate_daily_plan", req, handle_generate_daily_plan_callable, require_auth=True
    )


@https_fn.on_call(
    region=_settings.region,
    memory=options.MemoryOption.MB_512,
    timeout_sec=60,
    secrets=["GEMINI_API_KEY", "WAQI_API_TOKEN"],
)
def assess_indoor_air(req: https_fn.CallableRequest[Any]) -> Any:
    """Authenticated callable running the questionnaire-based Indoor Air Advisor (FR-07)."""
    return run_callable(
        "assess_indoor_air", req, handle_assess_indoor_air_callable, require_auth=True
    )


@https_fn.on_call(
    region=_settings.region,
    memory=options.MemoryOption.MB_512,
    timeout_sec=60,
    secrets=["GEMINI_API_KEY", "WAQI_API_TOKEN"],
)
def send_chat_message(req: https_fn.CallableRequest[Any]) -> Any:
    """Authenticated callable running the 5-node LangGraph Conversational Assistant (FR-08)."""
    return run_callable(
        "send_chat_message", req, handle_send_chat_message_callable, require_auth=True
    )


@https_fn.on_call(
    region=_settings.region,
    memory=options.MemoryOption.MB_256,
    timeout_sec=30,
)
def log_impact_action(req: https_fn.CallableRequest[Any]) -> Any:
    """Authenticated callable calculating & logging emissions or exposure actions (FR-09/10)."""
    return run_callable(
        "log_impact_action", req, handle_log_impact_action_callable, require_auth=True
    )


@https_fn.on_call(
    region=_settings.region,
    memory=options.MemoryOption.MB_256,
    timeout_sec=30,
)
def get_impact_summary(req: https_fn.CallableRequest[Any]) -> Any:
    """Authenticated callable returning separated emissions & exposure summary (FR-10)."""
    return run_callable(
        "get_impact_summary", req, handle_get_impact_summary_callable, require_auth=True
    )


@https_fn.on_call(
    region=_settings.region,
    memory=options.MemoryOption.MB_256,
    timeout_sec=30,
)
def delete_impact_action(req: https_fn.CallableRequest[Any]) -> Any:
    """Authenticated callable deleting a user-owned impact log record (FR-10)."""
    return run_callable(
        "delete_impact_action", req, handle_delete_impact_action_callable, require_auth=True
    )


@https_fn.on_call(
    region=_settings.region,
    memory=options.MemoryOption.MB_512,
    timeout_sec=30,
    secrets=["GEMINI_API_KEY"],
)
def translate_texts(req: https_fn.CallableRequest[Any]) -> Any:
    """Public bounded callable for real-time Indian-English batch translation."""
    return run_callable("translate_texts", req, handle_translate_texts_callable, require_auth=False)

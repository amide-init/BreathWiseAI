"""Firebase Cloud Functions Gen 2 Callable (`on_call`) entrypoints for BreatheWise AI.

Keep this file strictly as a thin bootstrapper. All business logic, providers,
repositories, deterministic domain rules, and LangGraph orchestration live
inside `app/`.
"""

from __future__ import annotations

from typing import Any

from firebase_functions import https_fn, options

from app.config.settings import get_settings
from app.routes.air_quality_routes import handle_get_air_quality_callable
from app.routes.health_routes import handle_health
from app.routes.location_routes import handle_location_search_callable
from app.utils.callable_utils import run_callable

_settings = get_settings()


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
    """Authenticated callable returning normalized matching city locations (FR-02)."""
    return run_callable("search_locations", req, handle_location_search_callable, require_auth=True)


@https_fn.on_call(
    region=_settings.region,
    memory=options.MemoryOption.MB_512,
    timeout_sec=60,
)
def get_air_quality(req: https_fn.CallableRequest[Any]) -> Any:
    """Authenticated callable returning cache-first CPCB NAQI, weather & forecasts (FR-03/04)."""
    return run_callable("get_air_quality", req, handle_get_air_quality_callable, require_auth=True)

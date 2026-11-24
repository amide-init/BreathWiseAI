"""Firebase Cloud Functions Gen 2 entrypoint for BreatheWise AI.

Keep this file strictly as a thin bootstrapper. All routing, business logic,
providers, repositories, deterministic domain rules, and LangGraph orchestration
live inside `app/`.
"""

from __future__ import annotations

from firebase_functions import https_fn, options

from app.config.settings import get_settings
from app.routes.router import dispatch_request

_settings = get_settings()


@https_fn.on_request(
    region=_settings.region,
    memory=options.MemoryOption.MB_512,
    timeout_sec=60,
    cors=options.CorsOptions(
        cors_origins="*", cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    ),
)
def api(req: https_fn.Request) -> https_fn.Response:
    """Primary HTTPS entrypoint handling `/api/v1/**` routes."""
    return dispatch_request(req)

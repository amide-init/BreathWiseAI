"""Google Gemini structured output provider implementing StructuredLLMProvider protocol."""

from __future__ import annotations

import hashlib
import threading
import time
from typing import Any, TypeVar

from google import genai
from google.genai import types
from pydantic import BaseModel

from app.config.secrets import GEMINI_API_KEY_ENV, get_optional_secret
from app.config.settings import AppSettings, get_settings
from app.utils.errors import UpstreamProviderError
from app.utils.logger import log_event

TModel = TypeVar("TModel", bound=BaseModel)

_CLIENT_LOCK = threading.Lock()
_CLIENT_POOL: dict[tuple[str, int], genai.Client] = {}


def _get_shared_genai_client(*, api_key: str, timeout_ms: int) -> genai.Client:
    """Reuse a shared `genai.Client` across warm invocations to avoid repeated TLS handshakes."""
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()[:16]
    cache_key = (key_hash, timeout_ms)
    client = _CLIENT_POOL.get(cache_key)
    if client is not None:
        return client
    with _CLIENT_LOCK:
        client = _CLIENT_POOL.get(cache_key)
        if client is None:
            client = genai.Client(
                api_key=api_key,
                http_options=types.HttpOptions(timeout=timeout_ms),
            )
            _CLIENT_POOL[cache_key] = client
        return client


def clear_shared_genai_clients() -> None:
    """Reset pooled Gemini clients (used in unit tests)."""
    with _CLIENT_LOCK:
        _CLIENT_POOL.clear()


def _extract_usage_metrics(response: Any) -> dict[str, int | None]:
    usage = getattr(response, "usage_metadata", None)
    if usage is None:
        return {}
    return {
        "prompt_tokens": getattr(usage, "prompt_token_count", None),
        "candidates_tokens": getattr(usage, "candidates_token_count", None),
        "thoughts_tokens": getattr(usage, "thoughts_token_count", None),
        "total_tokens": getattr(usage, "total_token_count", None),
    }


class GeminiStructuredProvider:
    """Bounded Google Gemini client enforcing strict Pydantic JSON structured outputs."""

    provider_name = "Google Gemini"

    def __init__(
        self,
        *,
        api_key: str | None = None,
        settings: AppSettings | None = None,
    ) -> None:
        self._api_key = api_key
        self._settings = settings or get_settings()

    def _resolve_api_key(self) -> str:
        key = self._api_key or get_optional_secret(GEMINI_API_KEY_ENV)
        if not key:
            raise UpstreamProviderError(self.provider_name, "GEMINI_API_KEY not configured.")
        return key

    def generate_structured(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_schema: type[TModel],
        max_output_tokens: int | None = None,
        thinking_budget: int | None = 0,
        operation_name: str = "structured_generation",
    ) -> TModel:
        api_key = self._resolve_api_key()
        timeout_ms = int(self._settings.gemini_timeout_seconds * 1000)
        started = time.perf_counter()
        try:
            client = _get_shared_genai_client(api_key=api_key, timeout_ms=timeout_ms)
            config_kwargs: dict[str, Any] = {
                "system_instruction": system_prompt,
                "response_mime_type": "application/json",
                "response_schema": response_schema,
                "temperature": 0.2,
            }
            if max_output_tokens is not None:
                config_kwargs["max_output_tokens"] = max_output_tokens
            if thinking_budget is not None:
                config_kwargs["thinking_config"] = types.ThinkingConfig(
                    thinking_budget=thinking_budget
                )

            response = client.models.generate_content(
                model=self._settings.gemini_model,
                contents=user_prompt,
                config=types.GenerateContentConfig(**config_kwargs),
            )
            raw_text = response.text
            if not raw_text:
                raise UpstreamProviderError(self.provider_name, "Empty structured response.")

            parsed = response_schema.model_validate_json(raw_text)
            latency_ms = round((time.perf_counter() - started) * 1000, 1)
            log_event(
                "gemini_usage",
                operation=operation_name,
                model=self._settings.gemini_model,
                latency_ms=latency_ms,
                thinking_budget=thinking_budget,
                **_extract_usage_metrics(response),
            )
            return parsed
        except UpstreamProviderError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise UpstreamProviderError(self.provider_name, f"Generation failed: {exc}") from exc

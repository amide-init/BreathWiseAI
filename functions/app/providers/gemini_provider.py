"""Google Gemini structured output provider implementing StructuredLLMProvider protocol."""

from __future__ import annotations

import hashlib
import json
import logging
import threading
import time
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
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


def _build_thinking_config(
    *,
    model_name: str,
    thinking_level: types.ThinkingLevel | str | None,
) -> types.ThinkingConfig | None:
    """Select the model-compatible ThinkingConfig (Gemini 3 uses thinking_level, 2.5 uses budget)."""
    if thinking_level is None:
        return None
    normalized = model_name.lower()
    if normalized.startswith("gemini-3"):
        level = (
            thinking_level
            if isinstance(thinking_level, types.ThinkingLevel)
            else types.ThinkingLevel(str(thinking_level).upper())
        )
        return types.ThinkingConfig(thinking_level=level)
    if normalized.startswith("gemini-2.5"):
        budget = 0 if str(thinking_level).upper() == "MINIMAL" else 256
        return types.ThinkingConfig(thinking_budget=budget)
    return None


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
        thinking_level: types.ThinkingLevel | str | None = types.ThinkingLevel.MINIMAL,
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
            thinking_cfg = _build_thinking_config(
                model_name=self._settings.gemini_model,
                thinking_level=thinking_level,
            )
            if thinking_cfg is not None:
                config_kwargs["thinking_config"] = thinking_cfg

            try:
                response = client.models.generate_content(
                    model=self._settings.gemini_model,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(**config_kwargs),
                )
            except Exception as first_exc:  # noqa: BLE001
                # Defensive retry without thinking_config if a future model rejects it
                if "thinking_config" in config_kwargs and "thinking" in str(first_exc).lower():
                    config_kwargs.pop("thinking_config", None)
                    response = client.models.generate_content(
                        model=self._settings.gemini_model,
                        contents=user_prompt,
                        config=types.GenerateContentConfig(**config_kwargs),
                    )
                else:
                    raise

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
                thinking_level=str(thinking_level) if thinking_level is not None else None,
                **_extract_usage_metrics(response),
            )
            return parsed
        except UpstreamProviderError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise UpstreamProviderError(self.provider_name, f"Generation failed: {exc}") from exc

    def _call_with_thinking_fallback(
        self,
        *,
        client: genai.Client,
        contents: Any,
        config_kwargs: dict[str, Any],
    ) -> Any:
        try:
            return client.models.generate_content(
                model=self._settings.gemini_model,
                contents=contents,
                config=types.GenerateContentConfig(**config_kwargs),
            )
        except Exception as first_exc:  # noqa: BLE001
            if "thinking_config" in config_kwargs and "thinking" in str(first_exc).lower():
                fallback_kwargs = dict(config_kwargs)
                fallback_kwargs.pop("thinking_config", None)
                return client.models.generate_content(
                    model=self._settings.gemini_model,
                    contents=contents,
                    config=types.GenerateContentConfig(**fallback_kwargs),
                )
            raise

    def generate_structured_with_tools(
        self,
        *,
        system_prompt: str,
        user_message: str,
        chat_history: list[dict[str, str]],
        tool_declarations: list[types.FunctionDeclaration],
        tool_handlers: dict[str, Callable[[dict[str, Any]], dict[str, Any]]],
        response_schema: type[TModel],
        validation_errors: list[str] | None = None,
        temperature: float = 0.45,
        max_output_tokens: int = 750,
        thinking_level: types.ThinkingLevel | str | None = types.ThinkingLevel.MINIMAL,
        operation_name: str = "chat_with_tools",
    ) -> tuple[TModel, list[str]]:
        """Two-phase native Gemini Function Calling + strictly structured synthesis.

        Phase 1: Gemini chooses ONLY the deterministic tools (0-4) relevant to the user's turn.
        Phase 2: Executes chosen tools in parallel and synthesizes a strictly typed Pydantic reply
                 using native multi-turn `user`/`model` history (avoiding repetitive context dumps).
        """
        api_key = self._resolve_api_key()
        timeout_ms = int(self._settings.gemini_timeout_seconds * 1000)
        started = time.perf_counter()
        try:
            client = _get_shared_genai_client(api_key=api_key, timeout_ms=timeout_ms)
            thinking_cfg = _build_thinking_config(
                model_name=self._settings.gemini_model,
                thinking_level=thinking_level,
            )

            history_contents: list[types.Content] = []
            for turn in chat_history[-6:]:
                content_text = str(turn.get("content") or "").strip()
                if not content_text:
                    continue
                role = "model" if turn.get("role") == "assistant" else "user"
                history_contents.append(
                    types.Content(role=role, parts=[types.Part.from_text(text=content_text)])
                )

            # Phase 1: Native Gemini Function Calling (decides which tools to pull on demand)
            router_contents = [
                *history_contents,
                types.Content(role="user", parts=[types.Part.from_text(text=user_message)]),
            ]
            router_instruction = (
                f"{system_prompt}\n\n"
                "TOOL SELECTION STEP:\n"
                "- Call ONLY the tool(s) needed (0 to 4 in parallel) to answer the user's latest "
                "message accurately and personally.\n"
                "- Do NOT call unrelated tools (for example, do not call `get_home_indoor_playbooks` "
                "unless the user asks about indoor air, cooking, smoking, dhoop, dust, or purifiers).\n"
                "- If prior turns and the system anchor already contain all needed facts, call NO tools "
                "and reply simply with READY."
            )
            router_kwargs: dict[str, Any] = {
                "system_instruction": router_instruction,
                "tools": [types.Tool(function_declarations=tool_declarations)],
                "temperature": 0.1,
                "max_output_tokens": 256,
            }
            if thinking_cfg is not None:
                router_kwargs["thinking_config"] = thinking_cfg

            router_response = self._call_with_thinking_fallback(
                client=client,
                contents=router_contents,
                config_kwargs=router_kwargs,
            )

            raw_calls = list(getattr(router_response, "function_calls", None) or [])
            unique_calls: list[tuple[str, dict[str, Any]]] = []
            seen_sigs: set[str] = set()
            for call in raw_calls[:5]:
                name = str(getattr(call, "name", "") or "")
                if not name or name not in tool_handlers:
                    continue
                args = dict(getattr(call, "args", None) or {})
                sig = f"{name}:{json.dumps(args, sort_keys=True, default=str)}"
                if sig in seen_sigs:
                    continue
                seen_sigs.add(sig)
                unique_calls.append((name, args))

            tools_called: list[str] = []
            executed_results: dict[str, Any] = {}
            if unique_calls:
                def _invoke(item: tuple[str, dict[str, Any]]) -> tuple[str, dict[str, Any]]:
                    tool_name, tool_args = item
                    try:
                        return tool_name, tool_handlers[tool_name](tool_args)
                    except Exception as tool_exc:  # noqa: BLE001
                        log_event(
                            "chat_dynamic_tool_error",
                            level=logging.WARNING,
                            tool=tool_name,
                            error=str(tool_exc),
                        )
                        return tool_name, {"error": "Tool temporarily unavailable."}

                with ThreadPoolExecutor(max_workers=min(4, len(unique_calls))) as pool:
                    for tool_name, tool_out in pool.map(_invoke, unique_calls):
                        tools_called.append(tool_name)
                        executed_results[tool_name] = tool_out

            # Phase 2: Strictly typed structured synthesis using ONLY the pulled tool results
            user_turn_parts = [f"USER_MESSAGE: {user_message}"]
            if executed_results:
                compact_results = json.dumps(
                    executed_results,
                    separators=(",", ":"),
                    ensure_ascii=False,
                    default=str,
                )
                user_turn_parts.append(f"PULLED_TOOL_RESULTS:{compact_results}")
            if validation_errors:
                user_turn_parts.append(
                    "PREVIOUS OUTPUT FAILED SAFETY VALIDATION — FIX ALL ISSUES:\n- "
                    + "\n- ".join(validation_errors)
                )

            synthesis_contents = [
                *history_contents,
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text="\n\n".join(user_turn_parts))],
                ),
            ]
            synthesis_kwargs: dict[str, Any] = {
                "system_instruction": system_prompt,
                "response_mime_type": "application/json",
                "response_schema": response_schema,
                "temperature": temperature,
                "max_output_tokens": max_output_tokens,
            }
            if thinking_cfg is not None:
                synthesis_kwargs["thinking_config"] = thinking_cfg

            synthesis_response = self._call_with_thinking_fallback(
                client=client,
                contents=synthesis_contents,
                config_kwargs=synthesis_kwargs,
            )
            raw_text = synthesis_response.text
            if not raw_text:
                raise UpstreamProviderError(self.provider_name, "Empty structured chat response.")

            parsed = response_schema.model_validate_json(raw_text)
            latency_ms = round((time.perf_counter() - started) * 1000, 1)
            router_usage = _extract_usage_metrics(router_response)
            synth_usage = _extract_usage_metrics(synthesis_response)
            total_prompt = (router_usage.get("prompt_tokens") or 0) + (
                synth_usage.get("prompt_tokens") or 0
            )
            total_candidates = (router_usage.get("candidates_tokens") or 0) + (
                synth_usage.get("candidates_tokens") or 0
            )
            log_event(
                "gemini_usage",
                operation=operation_name,
                model=self._settings.gemini_model,
                latency_ms=latency_ms,
                thinking_level=str(thinking_level) if thinking_level is not None else None,
                tools_called=tools_called,
                prompt_tokens=total_prompt or None,
                candidates_tokens=total_candidates or None,
                total_tokens=(total_prompt + total_candidates) or None,
            )
            return parsed, tools_called
        except UpstreamProviderError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise UpstreamProviderError(self.provider_name, f"Tool chat failed: {exc}") from exc

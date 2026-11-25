"""Google Gemini structured output provider implementing StructuredLLMProvider protocol."""

from __future__ import annotations

from typing import TypeVar

from google import genai
from google.genai import types
from pydantic import BaseModel

from app.config.secrets import GEMINI_API_KEY_ENV, get_optional_secret
from app.config.settings import AppSettings, get_settings
from app.utils.errors import UpstreamProviderError

TModel = TypeVar("TModel", bound=BaseModel)


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
    ) -> TModel:
        api_key = self._resolve_api_key()
        try:
            client = genai.Client(
                api_key=api_key,
                http_options=types.HttpOptions(
                    timeout=int(self._settings.gemini_timeout_seconds * 1000)
                ),
            )
            response = client.models.generate_content(
                model=self._settings.gemini_model,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    response_mime_type="application/json",
                    response_schema=response_schema,
                    temperature=0.2,
                ),
            )
            raw_text = response.text
            if not raw_text:
                raise UpstreamProviderError(self.provider_name, "Empty structured response.")
            return response_schema.model_validate_json(raw_text)
        except UpstreamProviderError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise UpstreamProviderError(self.provider_name, f"Generation failed: {exc}") from exc

"""Unit & AI-safety tests for real-time batch text translation."""

from __future__ import annotations

import pytest

from app.schemas.translation import TranslatedItem, TranslationBatchLLMOutput
from app.services.translation_service import TranslationService
from app.utils.errors import UpstreamProviderError, ValidationError


class _FakeTranslatorProvider:
    def __init__(self, responses: dict[int, str] | None = None, *, fail: bool = False) -> None:
        self._responses = responses or {}
        self._fail = fail
        self.calls = 0

    def generate_structured(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_schema: type[TranslationBatchLLMOutput],
    ) -> TranslationBatchLLMOutput:
        self.calls += 1
        if self._fail:
            raise UpstreamProviderError("Google Gemini", "Simulated timeout")
        return response_schema(
            items=[TranslatedItem(index=idx, text=val) for idx, val in self._responses.items()]
        )


def test_english_returns_passthrough_without_llm_call() -> None:
    provider = _FakeTranslatorProvider()
    service = TranslationService(llm_provider=provider)

    resp = service.translate_texts(language="en", texts=["Daily Plan", "AQI 142"])

    assert resp.language == "en"
    assert resp.translations == ["Daily Plan", "AQI 142"]
    assert resp.fallback_used is False
    assert provider.calls == 0


def test_hindi_with_english_terms_batch_translation_deduplicates_and_aligns() -> None:
    provider = _FakeTranslatorProvider(
        {
            0: "आज का Clean-Air Plan",
            1: "बाहर की हवा खराब है (AQI 245)",
        }
    )
    service = TranslationService(llm_provider=provider)

    resp = service.translate_texts(
        language="hi",
        texts=["Today's Clean-Air Plan", "Outdoor air is poor (AQI 245)", "Today's Clean-Air Plan"],
    )

    assert resp.language == "hi"
    assert resp.fallback_used is False
    assert resp.translations == [
        "आज का Clean-Air Plan",
        "बाहर की हवा खराब है (AQI 245)",
        "आज का Clean-Air Plan",
    ]
    assert provider.calls == 1


def test_numeric_safety_guard_rejects_altered_aqi_reading() -> None:
    # LLM hallucinates AQI 120 instead of 245 -> service MUST reject and keep original English.
    provider = _FakeTranslatorProvider(
        {
            0: "आज AQI 120 है, सब ठीक है",
            1: "PM2.5 85.4 µg/m³ है, N95 mask पहनें",
        }
    )
    service = TranslationService(llm_provider=provider)

    resp = service.translate_texts(
        language="hi",
        texts=[
            "Today AQI is 245, avoid outdoor jogging",
            "PM2.5 is 85.4 µg/m³, wear an N95 mask",
        ],
    )

    assert resp.translations[0] == "Today AQI is 245, avoid outdoor jogging"
    assert resp.translations[1] == "PM2.5 85.4 µg/m³ है, N95 mask पहनें"


def test_upstream_failure_falls_back_cleanly_to_english() -> None:
    provider = _FakeTranslatorProvider(fail=True)
    service = TranslationService(llm_provider=provider)

    resp = service.translate_texts(language="bn", texts=["Keep windows closed"])

    assert resp.fallback_used is True
    assert resp.translations == ["Keep windows closed"]


def test_validation_rejects_unsupported_language_and_oversized_batches() -> None:
    service = TranslationService(llm_provider=_FakeTranslatorProvider())

    with pytest.raises(ValidationError):
        service.translate_texts(language="hi-en", texts=["Hello"])

    with pytest.raises(ValidationError):
        service.translate_texts(language="hi", texts=["x"] * 61)

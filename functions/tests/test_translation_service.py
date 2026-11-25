"""Unit & AI-safety tests for real-time batch text translation and 2-tier server caching."""

from __future__ import annotations

import pytest

from app.schemas.translation import TranslatedItem, TranslationBatchLLMOutput
from app.services.translation_service import (
    TranslationService,
    clear_memory_translation_cache,
)
from app.utils.errors import UpstreamProviderError, ValidationError


class _FakeTranslatorProvider:
    def __init__(self, responses: dict[int, str] | None = None, *, fail: bool = False) -> None:
        self._responses = responses or {}
        self._fail = fail
        self.calls = 0
        self.last_user_prompt = ""

    def generate_structured(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_schema: type[TranslationBatchLLMOutput],
    ) -> TranslationBatchLLMOutput:
        self.calls += 1
        self.last_user_prompt = user_prompt
        if self._fail:
            raise UpstreamProviderError("Google Gemini", "Simulated timeout")
        return response_schema(
            items=[TranslatedItem(index=idx, text=val) for idx, val in self._responses.items()]
        )


class _FakeCacheStore:
    def __init__(self) -> None:
        self.data: dict[str, str] = {}
        self.reads = 0
        self.writes = 0

    def get_many(self, keys: list[str]) -> dict[str, str]:
        self.reads += 1
        return {k: self.data[k] for k in keys if k in self.data}

    def set_many(self, entries: dict[str, tuple[str, str]]) -> None:
        self.writes += 1
        for k, (_, translated) in entries.items():
            self.data[k] = translated


@pytest.fixture(autouse=True)
def _reset_mem_cache() -> None:
    clear_memory_translation_cache()


def test_english_returns_passthrough_without_llm_call() -> None:
    provider = _FakeTranslatorProvider()
    cache = _FakeCacheStore()
    service = TranslationService(llm_provider=provider, cache_store=cache)

    resp = service.translate_texts(language="en", texts=["Daily Plan", "AQI 142"])

    assert resp.language == "en"
    assert resp.translations == ["Daily Plan", "AQI 142"]
    assert resp.fallback_used is False
    assert provider.calls == 0
    assert cache.reads == 0


def test_hindi_batch_translation_caches_in_memory_and_shared_store() -> None:
    provider = _FakeTranslatorProvider(
        {
            0: "आज की स्वच्छ वायु योजना",
            1: "बाहर की हवा खराब है (AQI 245)",
        }
    )
    cache = _FakeCacheStore()
    service = TranslationService(llm_provider=provider, cache_store=cache)

    first = service.translate_texts(
        language="hi",
        texts=[
            "Today's Clean-Air Plan",
            "Outdoor air is poor (AQI 245)",
            "Today's   Clean-Air\nPlan",
        ],
    )
    assert first.translations == [
        "आज की स्वच्छ वायु योजना",
        "बाहर की हवा खराब है (AQI 245)",
        "आज की स्वच्छ वायु योजना",
    ]
    assert provider.calls == 1
    assert cache.writes == 1

    # Second call on warm instance hits memory cache -> 0 LLM calls, 0 extra Firestore reads.
    second = service.translate_texts(
        language="hi",
        texts=["Today's Clean-Air Plan", "Outdoor air is poor (AQI 245)"],
    )
    assert second.translations == [
        "आज की स्वच्छ वायु योजना",
        "बाहर की हवा खराब है (AQI 245)",
    ]
    assert provider.calls == 1

    # Cold instance (memory cleared) hits shared Firestore cache -> still 0 LLM calls!
    clear_memory_translation_cache()
    third = service.translate_texts(
        language="hi",
        texts=["Today's Clean-Air Plan"],
    )
    assert third.translations == ["आज की स्वच्छ वायु योजना"]
    assert provider.calls == 1


def test_numeric_safety_guard_rejects_altered_aqi_reading() -> None:
    provider = _FakeTranslatorProvider(
        {
            0: "आज AQI 120 है, सब ठीक है",
            1: "PM2.5 85.4 µg/m³ है, N95 मास्क पहनें",
            2: "15 मिनट बाद तक चलाएं और खाना बनाने से 5 मिनट पहले एग्जॉस्ट चालू करें।",
        }
    )
    cache = _FakeCacheStore()
    service = TranslationService(llm_provider=provider, cache_store=cache)

    resp = service.translate_texts(
        language="hi",
        texts=[
            "Today AQI is 245, avoid outdoor jogging",
            "PM2.5 is 85.4 µg/m³, wear an N95 mask",
            "Turn on exhaust 5 minutes before cooking and keep on for 15 minutes afterward.",
        ],
    )

    assert resp.translations[0] == "Today AQI is 245, avoid outdoor jogging"
    assert resp.translations[1] == "PM2.5 85.4 µg/m³ है, N95 मास्क पहनें"
    assert resp.translations[2] == ("15 मिनट बाद तक चलाएं और खाना बनाने से 5 मिनट पहले एग्जॉस्ट चालू करें।")
    # Only the 2 valid translations should be written to shared cache (never the rejected item).
    assert len(cache.data) == 2


def test_upstream_failure_falls_back_cleanly_without_caching() -> None:
    provider = _FakeTranslatorProvider(fail=True)
    cache = _FakeCacheStore()
    service = TranslationService(llm_provider=provider, cache_store=cache)

    resp = service.translate_texts(language="bn", texts=["Keep windows closed"])

    assert resp.fallback_used is True
    assert resp.translations == ["Keep windows closed"]
    assert cache.writes == 0


def test_validation_rejects_unsupported_language_and_oversized_batches() -> None:
    service = TranslationService(
        llm_provider=_FakeTranslatorProvider(),
        cache_store=_FakeCacheStore(),
    )

    with pytest.raises(ValidationError):
        service.translate_texts(language="hi-en", texts=["Hello"])

    with pytest.raises(ValidationError):
        service.translate_texts(language="hi", texts=["x"] * 61)

"""Real-time batch text translation service backed by Gemini Flash with numeric safety guards."""

from __future__ import annotations

import json
import logging
import re
from typing import Protocol

from app.providers.gemini_provider import GeminiStructuredProvider
from app.schemas.translation import (
    SUPPORTED_LANGUAGES,
    TranslateTextsResponse,
    TranslationBatchLLMOutput,
)
from app.utils.errors import UpstreamProviderError, ValidationError
from app.utils.logger import log_event

MAX_TEXTS_PER_BATCH = 60
MAX_CHARS_PER_TEXT = 1_000
MAX_TOTAL_CHARS = 20_000

# Matches ASCII numeric tokens (integers/decimals) so we can verify no reading is altered.
_NUMBER_TOKEN_RE = re.compile(r"\d+(?:\.\d+)?")

# Maps native Indian script numerals to ASCII 0-9 before checking numeric integrity.
_NATIVE_DIGIT_TRANS = str.maketrans(
    "०१२३४५६७८९০১২৩৪৫৬৭৮৯௦௧௨௩௪௫௬௭௮௯౦౧౨౩౪౫౬౭౮౯",
    "0123456789012345678901234567890123456789",
)


class StructuredTranslatorProvider(Protocol):
    def generate_structured(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_schema: type[TranslationBatchLLMOutput],
    ) -> TranslationBatchLLMOutput: ...


def normalize_language(raw: str | None) -> str:
    """Validate and normalize a requested language code."""
    code = (raw or "en").strip().lower()
    if code not in SUPPORTED_LANGUAGES:
        allowed = ", ".join(sorted(SUPPORTED_LANGUAGES.keys()))
        raise ValidationError(f"Unsupported language '{code}'. Supported: {allowed}.")
    return code


def normalize_digits(text: str) -> str:
    """Normalize any native Indian numerals back to standard ASCII digits 0-9."""
    return text.translate(_NATIVE_DIGIT_TRANS)


def numbers_preserved(original: str, translated: str) -> bool:
    """Ensure translation did not alter, drop, or fabricate any numeric measurement.

    Compares sorted multisets so natural Indian-language grammar (SOV clause order)
    can reorder two numbers in a sentence without losing or altering any figure.
    """
    orig_nums = sorted(_NUMBER_TOKEN_RE.findall(normalize_digits(original)))
    next_nums = sorted(_NUMBER_TOKEN_RE.findall(normalize_digits(translated)))
    return orig_nums == next_nums


class TranslationService:
    """Translates batches of UI & AI-generated English strings into Indian-English varieties."""

    def __init__(self, llm_provider: StructuredTranslatorProvider | None = None) -> None:
        self._llm = llm_provider or GeminiStructuredProvider()

    def translate_texts(self, *, language: str, texts: list[str]) -> TranslateTextsResponse:
        lang = normalize_language(language)

        if not texts:
            return TranslateTextsResponse(language=lang, translations=[], fallback_used=False)

        if len(texts) > MAX_TEXTS_PER_BATCH:
            raise ValidationError(
                f"Too many texts in one request (max {MAX_TEXTS_PER_BATCH} per batch)."
            )

        cleaned: list[str] = []
        total_chars = 0
        for item in texts:
            text = str(item)
            if len(text) > MAX_CHARS_PER_TEXT:
                raise ValidationError(
                    f"Single text exceeds maximum length of {MAX_CHARS_PER_TEXT} characters."
                )
            total_chars += len(text)
            cleaned.append(text)

        if total_chars > MAX_TOTAL_CHARS:
            raise ValidationError(
                f"Batch total character limit exceeded (max {MAX_TOTAL_CHARS} chars)."
            )

        if lang == "en":
            return TranslateTextsResponse(language="en", translations=cleaned, fallback_used=False)

        # Deduplicate while preserving index mapping so repeated labels cost zero extra tokens.
        unique_texts: list[str] = []
        text_to_unique_idx: dict[str, int] = {}
        for text in cleaned:
            if not text.strip():
                continue
            if text not in text_to_unique_idx:
                text_to_unique_idx[text] = len(unique_texts)
                unique_texts.append(text)

        if not unique_texts:
            return TranslateTextsResponse(language=lang, translations=cleaned, fallback_used=False)

        lang_meta = SUPPORTED_LANGUAGES[lang]
        system_prompt = (
            f"You are a fluent, natural translator for BreatheWise AI (an Indian clean-air app).\n"
            f"Target language: {lang_meta['label']} — {lang_meta['style']}\n\n"
            "STRICT RULES:\n"
            "1. Translate EVERY text COMPLETELY into natural, everyday native script "
            "(Devanagari for Hindi/Marathi, Bengali script for Bengali, Tamil script for Tamil, "
            "Telugu script for Telugu). Do NOT leave ordinary English words untranslated "
            "(translate words like Dashboard, Plan, Settings, Profile, Outdoor, Indoor, Exercise, "
            "Moderate, Refresh, Save, Sign In, Sign Out, Light Mode, Dark Mode, etc.).\n"
            "2. Keep ONLY scientific/measurement abbreviations & brand names intact: "
            "BreatheWise AI, AQI, PM2.5, PM10, NO2, SO2, O3, CO, CO2, CPCB, NAQI, EPA, N95, HEPA, "
            "µg/m³, °C, km/h, kg CO2e, %.\n"
            "3. Preserve EVERY number using standard ASCII digits (0-9) EXACTLY as given. Never "
            "convert digits to native numerals, and never round, change, add, or drop any number.\n"
            "4. Keep medical/emergency warnings clear and non-diagnostic.\n"
            "5. Keep short UI button/tab labels concise so layouts do not overflow.\n"
            "6. Return an item for EVERY input index in JSON matching the schema."
        )

        payload_items = [{"index": idx, "text": text} for idx, text in enumerate(unique_texts)]
        user_prompt = (
            f"Translate each item below into {lang_meta['label']}:\n"
            f"{json.dumps(payload_items, ensure_ascii=False)}"
        )

        try:
            llm_output = self._llm.generate_structured(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                response_schema=TranslationBatchLLMOutput,
            )
        except UpstreamProviderError as exc:
            log_event(
                "translation_batch_fallback",
                level=logging.WARNING,
                language=lang,
                count=len(unique_texts),
                error=str(exc),
            )
            return TranslateTextsResponse(language=lang, translations=cleaned, fallback_used=True)

        translated_by_idx: dict[int, str] = {}
        for item in llm_output.items:
            if 0 <= item.index < len(unique_texts):
                original = unique_texts[item.index]
                candidate = normalize_digits(item.text.strip())
                if candidate and numbers_preserved(original, candidate):
                    translated_by_idx[item.index] = candidate
                else:
                    # Numeric safety guard: never return corrupted AQI / pollutant / CO2 figures.
                    translated_by_idx[item.index] = original

        result: list[str] = []
        for text in cleaned:
            if not text.strip():
                result.append(text)
            else:
                u_idx = text_to_unique_idx[text]
                result.append(translated_by_idx.get(u_idx, text))

        return TranslateTextsResponse(language=lang, translations=result, fallback_used=False)

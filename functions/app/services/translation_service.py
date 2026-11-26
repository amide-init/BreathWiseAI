"""Real-time batch text translation service backed by Gemini Flash with 2-tier server caching."""

from __future__ import annotations

import hashlib
import json
import logging
import re
from collections import OrderedDict
from datetime import UTC, datetime
from typing import Any, Protocol

from app.providers.gemini_provider import GeminiStructuredProvider
from app.repositories.base_repo import BaseFirestoreRepository
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
MAX_MEMORY_CACHE_ENTRIES = 4_000
TRANSLATION_CACHE_COLLECTION = "translation_cache"

# Matches ASCII numeric tokens (integers/decimals) so we can verify no reading is altered.
_NUMBER_TOKEN_RE = re.compile(r"\d+(?:\.\d+)?")
_WHITESPACE_RE = re.compile(r"\s+")

# Maps native Indian script numerals to ASCII 0-9 before checking numeric integrity.
_NATIVE_DIGIT_TRANS = str.maketrans(
    "०१२३४५६७८९০১২৩৪৫৬৭৮৯௦௧௨௩௪௫௬௭௮௯౦౧౨౩౪౫౬౭౮౯",
    "0123456789012345678901234567890123456789",
)

# Process-local LRU cache shared across warm Cloud Run invocations (<1ms, $0 Gemini cost).
_MEMORY_CACHE: OrderedDict[str, str] = OrderedDict()


class StructuredTranslatorProvider(Protocol):
    def generate_structured(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_schema: type[TranslationBatchLLMOutput],
    ) -> TranslationBatchLLMOutput: ...


class TranslationCacheStore(Protocol):
    """Pluggable shared cache store (Firestore in production, fake/in-memory in tests)."""

    def get_many(self, keys: list[str]) -> dict[str, str]: ...

    def set_many(self, entries: dict[str, tuple[str, str]]) -> None: ...


class FirestoreTranslationCacheStore(BaseFirestoreRepository):
    """Backend-only shared Firestore cache (`translation_cache/{lang}_{sha256}`).

    Stores only hashed language+source pairs with zero user IDs or PII metadata so all
    users benefit from instant ~40ms translations with ~95%+ lower Gemini API spend.
    """

    def _client(self) -> Any | None:
        try:
            return self.db
        except Exception:  # noqa: BLE001
            return None

    def get_many(self, keys: list[str]) -> dict[str, str]:
        if not keys:
            return {}
        db = self._client()
        if db is None:
            return {}
        try:
            col = db.collection(TRANSLATION_CACHE_COLLECTION)
            refs = [col.document(key) for key in keys]
            hits: dict[str, str] = {}
            for snap in db.get_all(refs):
                if snap.exists:
                    data = snap.to_dict() or {}
                    translated = data.get("translatedText")
                    if isinstance(translated, str) and translated.strip():
                        hits[snap.id] = translated.strip()
            return hits
        except Exception as exc:  # noqa: BLE001
            log_event(
                "translation_cache_read_failed",
                level=logging.WARNING,
                count=len(keys),
                error=str(exc),
            )
            return {}

    def set_many(self, entries: dict[str, tuple[str, str]]) -> None:
        if not entries:
            return
        db = self._client()
        if db is None:
            return
        try:
            col = db.collection(TRANSLATION_CACHE_COLLECTION)
            batch = db.batch()
            now_iso = datetime.now(UTC).isoformat()
            for doc_id, (lang, translated) in entries.items():
                batch.set(
                    col.document(doc_id),
                    {
                        "language": lang,
                        "translatedText": translated,
                        "updatedAt": now_iso,
                    },
                    merge=True,
                )
            batch.commit()
        except Exception as exc:  # noqa: BLE001
            log_event(
                "translation_cache_write_failed",
                level=logging.WARNING,
                count=len(entries),
                error=str(exc),
            )


def normalize_language(raw: str | None) -> str:
    """Validate and normalize a requested language code."""
    code = (raw or "en").strip().lower()
    if code not in SUPPORTED_LANGUAGES:
        allowed = ", ".join(sorted(SUPPORTED_LANGUAGES.keys()))
        raise ValidationError(f"Unsupported language '{code}'. Supported: {allowed}.")
    return code


def normalize_source_text(text: str) -> str:
    """Collapse internal whitespace so DOM text nodes share identical cache keys."""
    return _WHITESPACE_RE.sub(" ", text).strip()


def make_cache_key(language: str, normalized_text: str) -> str:
    """Deterministic compact Firestore document key (`<lang>_<sha256[:20]>`)."""
    digest = hashlib.sha256(f"{language}::{normalized_text}".encode()).hexdigest()[:20]
    return f"{language}_{digest}"


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


def _memory_get(key: str) -> str | None:
    value = _MEMORY_CACHE.get(key)
    if value is not None:
        _MEMORY_CACHE.move_to_end(key)
    return value


def _memory_set(key: str, value: str) -> None:
    _MEMORY_CACHE[key] = value
    _MEMORY_CACHE.move_to_end(key)
    while len(_MEMORY_CACHE) > MAX_MEMORY_CACHE_ENTRIES:
        _MEMORY_CACHE.popitem(last=False)


def clear_memory_translation_cache() -> None:
    """Clear the process-local translation LRU cache (used in tests)."""
    _MEMORY_CACHE.clear()


class TranslationService:
    """Translates batches of UI & Firestore view strings with 2-tier server caching."""

    def __init__(
        self,
        llm_provider: StructuredTranslatorProvider | None = None,
        cache_store: TranslationCacheStore | None = None,
        *,
        use_memory_cache: bool = True,
    ) -> None:
        self._llm = llm_provider or GeminiStructuredProvider()
        self._cache_store = (
            cache_store if cache_store is not None else FirestoreTranslationCacheStore()
        )
        self._use_memory_cache = use_memory_cache

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

        # Deduplicate by normalized text so repeated labels cost zero extra lookups/tokens.
        unique_norms: list[str] = []
        norm_to_key: dict[str, str] = {}
        for text in cleaned:
            norm = normalize_source_text(text)
            if not norm or norm in norm_to_key:
                continue
            norm_to_key[norm] = make_cache_key(lang, norm)
            unique_norms.append(norm)

        if not unique_norms:
            return TranslateTextsResponse(language=lang, translations=cleaned, fallback_used=False)

        resolved: dict[str, str] = {}
        uncached_after_mem: list[str] = []

        # Tier 2: Process-local warm memory LRU cache (<1ms, $0)
        for norm in unique_norms:
            key = norm_to_key[norm]
            hit = _memory_get(key) if self._use_memory_cache else None
            if hit is not None:
                resolved[norm] = hit
            else:
                uncached_after_mem.append(norm)

        # Tier 3: Shared Firestore translation cache (~40ms, $0 Gemini cost across all users)
        missing_for_llm: list[str] = []
        if uncached_after_mem:
            fs_keys = [norm_to_key[norm] for norm in uncached_after_mem]
            fs_hits = self._cache_store.get_many(fs_keys)
            for norm in uncached_after_mem:
                key = norm_to_key[norm]
                hit = fs_hits.get(key)
                if hit is not None and numbers_preserved(norm, hit):
                    resolved[norm] = hit
                    if self._use_memory_cache:
                        _memory_set(key, hit)
                else:
                    missing_for_llm.append(norm)

        # Tier 4: Call Gemini Flash ONLY for brand-new strings never seen before.
        fallback_used = False
        if missing_for_llm:
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

            payload_items = [
                {"index": idx, "text": text} for idx, text in enumerate(missing_for_llm)
            ]
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
                    count=len(missing_for_llm),
                    error=str(exc),
                )
                fallback_used = True
            else:
                new_cache_entries: dict[str, tuple[str, str]] = {}
                for item in llm_output.items:
                    if 0 <= item.index < len(missing_for_llm):
                        original = missing_for_llm[item.index]
                        candidate = normalize_digits(item.text.strip())
                        if (
                            candidate
                            and candidate != original
                            and numbers_preserved(original, candidate)
                        ):
                            resolved[original] = candidate
                            key = norm_to_key[original]
                            if self._use_memory_cache:
                                _memory_set(key, candidate)
                            new_cache_entries[key] = (lang, candidate)

                if new_cache_entries:
                    self._cache_store.set_many(new_cache_entries)

        result: list[str] = []
        for text in cleaned:
            norm = normalize_source_text(text)
            if not norm:
                result.append(text)
            else:
                result.append(resolved.get(norm, text))

        return TranslateTextsResponse(
            language=lang,
            translations=result,
            fallback_used=fallback_used,
        )

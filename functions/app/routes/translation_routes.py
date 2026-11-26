"""Thin callable route handler for `translate_texts` real-time frontend translation."""

from __future__ import annotations

from typing import Any

from app.schemas.translation import TranslateTextsResponse
from app.services.translation_service import TranslationService
from app.utils.callable_utils import get_callable_data
from app.utils.errors import ValidationError


def handle_translate_texts_callable(req: Any) -> TranslateTextsResponse:
    """Validate batch translation input and return aligned translated strings."""
    data = get_callable_data(req)
    language = str(data.get("language") or "en").strip()
    raw_texts = data.get("texts")

    if not isinstance(raw_texts, list):
        raise ValidationError("Parameter 'texts' must be a list of strings.")

    texts: list[str] = []
    for entry in raw_texts:
        if not isinstance(entry, str):
            raise ValidationError("Every item in 'texts' must be a string.")
        texts.append(entry)

    return TranslationService().translate_texts(language=language, texts=texts)

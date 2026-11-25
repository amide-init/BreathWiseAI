"""Pydantic schemas and language definitions for real-time batch text translation."""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas.common import ApiModel

SUPPORTED_LANGUAGES: dict[str, dict[str, str]] = {
    "en": {
        "label": "English",
        "style": "Standard clear English.",
    },
    "hi": {
        "label": "Hindi (हिन्दी + everyday English terms)",
        "style": (
            "Natural everyday Hindi written in Devanagari script (हिन्दी), keeping common "
            "everyday English & technical words in English script where natural (e.g., AQI, "
            "PM2.5, N95 mask, HEPA, indoor, outdoor, workout, Dashboard, Plan, Settings). "
            "Example: 'आज बाहर की हवा खराब है — outdoor jogging avoid करें और indoor workout करें।'"
        ),
    },
    "bn": {
        "label": "Bengali (বাংলা + everyday English terms)",
        "style": (
            "Natural everyday Bengali written in Bengali script (বাংলা), keeping common "
            "everyday English & technical words in English script where natural (e.g., AQI, "
            "PM2.5, N95 mask, HEPA, indoor, outdoor, workout, Dashboard, Plan, Settings). "
            "Example: 'আজ বাইরের হাওয়া খারাপ — outdoor jogging এড়িয়ে চলুন এবং indoor workout করুন।'"
        ),
    },
    "mr": {
        "label": "Marathi (मराठी + everyday English terms)",
        "style": (
            "Natural everyday Marathi written in Devanagari script (मराठी), keeping common "
            "everyday English & technical words in English script where natural (e.g., AQI, "
            "PM2.5, N95 mask, HEPA, indoor, outdoor, workout, Dashboard, Plan, Settings). "
            "Example: 'आज बाहेरची हवा खराब आहे — outdoor jogging टाळा आणि indoor workout करा.'"
        ),
    },
    "ta": {
        "label": "Tamil (தமிழ் + everyday English terms)",
        "style": (
            "Natural everyday Tamil written in Tamil script (தமிழ்), keeping common "
            "everyday English & technical words in English script where natural (e.g., AQI, "
            "PM2.5, N95 mask, HEPA, indoor, outdoor, workout, Dashboard, Plan, Settings). "
            "Example: 'இன்று வெளியே காற்று தரம் மோசமாக உள்ளது — outdoor jogging தவிர்த்து indoor workout செய்யுங்கள்.'"
        ),
    },
    "te": {
        "label": "Telugu (తెలుగు + everyday English terms)",
        "style": (
            "Natural everyday Telugu written in Telugu script (తెలుగు), keeping common "
            "everyday English & technical words in English script where natural (e.g., AQI, "
            "PM2.5, N95 mask, HEPA, indoor, outdoor, workout, Dashboard, Plan, Settings). "
            "Example: 'ఈరోజు బయట గాలి నాణ్యత తక్కువగా ఉంది — outdoor jogging మాని indoor workout చేయండి.'"
        ),
    },
}


class TranslatedItem(BaseModel):
    """Single indexed translated string returned by Gemini structured output."""

    index: int = Field(ge=0)
    text: str


class TranslationBatchLLMOutput(BaseModel):
    """Structured batch output returned by Gemini Flash."""

    items: list[TranslatedItem] = Field(default_factory=list)


class TranslateTextsResponse(ApiModel):
    """Callable response payload aligned 1-to-1 with input `texts`."""

    language: str
    translations: list[str]
    fallback_used: bool = False

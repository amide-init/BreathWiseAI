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
        "label": "Hindi (हिन्दी)",
        "style": (
            "Complete, natural, everyday Hindi written fully in Devanagari script (हिन्दी). "
            "Translate all headings, buttons, labels, descriptions, and advice fully into clear "
            "Hindi — keep ONLY scientific symbols/units (AQI, PM2.5, PM10, N95, HEPA, CPCB, CO2, "
            "°C, µg/m³) and the brand name BreatheWise AI in English. "
            "Example: 'आज बाहर की हवा खराब है — बाहर व्यायाम से बचें और घर के अंदर कसरत करें।'"
        ),
    },
    "bn": {
        "label": "Bengali (বাংলা)",
        "style": (
            "Complete, natural, everyday Bengali written fully in Bengali script (বাংলা). "
            "Translate all headings, buttons, labels, descriptions, and advice fully into clear "
            "Bengali — keep ONLY scientific symbols/units (AQI, PM2.5, PM10, N95, HEPA, CPCB, CO2, "
            "°C, µg/m³) and the brand name BreatheWise AI in English. "
            "Example: 'আজ বাইরের বাতাস খারাপ — বাইরে ব্যায়াম এড়িয়ে চলুন এবং ঘরের ভেতরে ব্যায়াম করুন।'"
        ),
    },
    "mr": {
        "label": "Marathi (मराठी)",
        "style": (
            "Complete, natural, everyday Marathi written fully in Devanagari script (मराठी). "
            "Translate all headings, buttons, labels, descriptions, and advice fully into clear "
            "Marathi — keep ONLY scientific symbols/units (AQI, PM2.5, PM10, N95, HEPA, CPCB, CO2, "
            "°C, µg/m³) and the brand name BreatheWise AI in English. "
            "Example: 'आज बाहेरची हवा खराब आहे — बाहेर व्यायाम टाळा आणि घरातच व्यायाम करा.'"
        ),
    },
    "ta": {
        "label": "Tamil (தமிழ்)",
        "style": (
            "Complete, natural, everyday Tamil written fully in Tamil script (தமிழ்). "
            "Translate all headings, buttons, labels, descriptions, and advice fully into clear "
            "Tamil — keep ONLY scientific symbols/units (AQI, PM2.5, PM10, N95, HEPA, CPCB, CO2, "
            "°C, µg/m³) and the brand name BreatheWise AI in English. "
            "Example: 'இன்று வெளியே காற்றின் தரம் மோசமாக உள்ளது — வெளியே உடற்பயிற்சியைத் தவிர்த்து வீட்டிற்குள் செய்யுங்கள்.'"
        ),
    },
    "te": {
        "label": "Telugu (తెలుగు)",
        "style": (
            "Complete, natural, everyday Telugu written fully in Telugu script (తెలుగు). "
            "Translate all headings, buttons, labels, descriptions, and advice fully into clear "
            "Telugu — keep ONLY scientific symbols/units (AQI, PM2.5, PM10, N95, HEPA, CPCB, CO2, "
            "°C, µg/m³) and the brand name BreatheWise AI in English. "
            "Example: 'ఈరోజు బయట గాలి నాణ్యత తక్కువగా ఉంది — బయట వ్యాయామం మాని ఇంట్లోనే వ్యాయామం చేయండి.'"
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

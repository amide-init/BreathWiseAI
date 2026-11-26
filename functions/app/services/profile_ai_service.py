"""AI-assisted natural-language family & home setup parser (zero PII logged)."""

from __future__ import annotations

import logging
import re
from typing import Protocol

from app.providers.gemini_provider import GeminiStructuredProvider
from app.schemas.profile_ai import ParsedHouseholdDraft, ParsedMemberDraft
from app.utils.errors import UpstreamProviderError, ValidationError
from app.utils.logger import log_event

MAX_DESCRIPTION_CHARS = 800

_KM_RE = re.compile(r"(\d{1,3})\s*(?:km|kms|kilometer|kilometre)", re.I)


class HouseholdParserLLM(Protocol):
    def generate_structured(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_schema: type[ParsedHouseholdDraft],
    ) -> ParsedHouseholdDraft: ...


def _deterministic_parse_fallback(description: str) -> ParsedHouseholdDraft:
    """Best-effort regex parser when Gemini is unavailable."""
    text = description.lower()

    commute_mode = "personal_car"
    if any(
        k in text for k in ("two wheeler", "two-wheeler", "scooter", "scooty", "bike", "motorcycle")
    ):
        commute_mode = "two_wheeler"
    elif any(k in text for k in ("metro", "bus", "train", "public transit", "local")):
        commute_mode = "public_transit"
    elif any(k in text for k in ("wfh", "work from home", "remote")):
        commute_mode = "wfh"
    elif any(k in text for k in ("cycle", "bicycle", "walk to")):
        commute_mode = "walk_cycle"

    km_match = _KM_RE.search(text)
    daily_km = float(km_match.group(1)) if km_match else (0.0 if commute_mode == "wfh" else 15.0)

    has_hepa = any(k in text for k in ("hepa", "air purifier", "purifier")) and not any(
        k in text for k in ("no purifier", "no air purifier", "without purifier", "no hepa")
    )
    has_exhaust = not any(k in text for k in ("no chimney", "no exhaust", "without exhaust"))
    smoking = any(
        k in text for k in ("smoke", "smoking", "cigarette", "smoker", "bidi")
    ) and not any(k in text for k in ("no smoking", "don't smoke", "non-smoker"))
    incense = any(k in text for k in ("dhoop", "agarbatti", "incense", "puja smoke"))
    dry_broom = any(k in text for k in ("broom", "jhadu", "dry sweep"))

    resp_flag = any(
        k in text for k in ("asthma", "wheez", "allergy", "allergies", "breathing", "sinus")
    )

    members: list[ParsedMemberDraft] = [
        ParsedMemberDraft(
            nickname="Me",
            role="working_adult",
            age_group="18_45",
            has_respiratory_sensitivity=resp_flag
            and not any(k in text for k in ("son", "daughter", "kid", "child")),
        )
    ]
    if any(k in text for k in ("wife", "husband", "spouse", "partner")):
        members.append(
            ParsedMemberDraft(nickname="Partner", role="working_adult", age_group="18_45")
        )
    if any(k in text for k in ("toddler", "baby", "infant")):
        members.append(
            ParsedMemberDraft(
                nickname="Toddler",
                role="child_toddler",
                age_group="0_5",
                has_respiratory_sensitivity=resp_flag,
            )
        )
    elif any(k in text for k in ("son", "daughter", "kid", "child", "school")):
        members.append(
            ParsedMemberDraft(
                nickname="Child",
                role="child_school",
                age_group="6_12",
                has_respiratory_sensitivity=resp_flag,
            )
        )
    if any(
        k in text
        for k in (
            "dad",
            "father",
            "mom",
            "mother",
            "grandma",
            "grandpa",
            "elder",
            "parents",
            "senior",
        )
    ):
        members.append(
            ParsedMemberDraft(
                nickname="Parent",
                role="elderly",
                age_group="60_plus",
                has_respiratory_sensitivity=resp_flag,
            )
        )

    return ParsedHouseholdDraft(
        household_name="My Household",
        primary_commute_mode=commute_mode,  # type: ignore[arg-type]
        daily_commute_km=min(200.0, max(0.0, daily_km)),
        has_hepa_purifier=has_hepa,
        has_kitchen_exhaust=has_exhaust,
        indoor_smoking_present=smoking,
        incense_or_dhoop_daily=incense,
        dust_cleaning_method="dry_broom" if dry_broom else "wet_mop",
        members=members,
        summary_note=f"Detected {len(members)} household member(s) and key home habits — tap any chip to adjust.",
        fallback_used=True,
    )


class ProfileAiService:
    """Parses natural-language household descriptions into structured editable drafts."""

    def __init__(self, llm_provider: HouseholdParserLLM | None = None) -> None:
        self._llm = llm_provider or GeminiStructuredProvider()

    def parse_household_description(self, *, description: str) -> ParsedHouseholdDraft:
        cleaned = description.strip()
        if len(cleaned) < 4:
            raise ValidationError("Please describe your family or home in a short sentence.")
        if len(cleaned) > MAX_DESCRIPTION_CHARS:
            raise ValidationError(
                f"Description is too long (max {MAX_DESCRIPTION_CHARS} characters)."
            )

        system_prompt = (
            "You are BreatheWise AI's household setup assistant for Indian families.\n"
            "Extract a clean, accurate structured household draft from the user's casual description "
            "(which may be in English, Hindi, or mixed Indian speech).\n\n"
            "RULES:\n"
            "1. Extract every family member mentioned (include 'Me' if the user refers to themselves) "
            "with realistic short nicknames (e.g. 'Me', 'Wife', 'Aarav', 'Dad'), accurate role, "
            "ageGroup, and sensitivity flags ONLY if mentioned.\n"
            "2. Accurately capture honest indoor habits: indoorSmokingPresent (true if smoking at "
            "home/balcony is mentioned), incenseOrDhoopDaily (true if agarbatti/dhoop/puja smoke is "
            "mentioned), hasHepaPurifier (false unless user says they own one), hasKitchenExhaust, "
            "cookingFuel, dustCleaningMethod, and commute mode/km.\n"
            "3. Never diagnose medical conditions; map asthma/dust allergy mentions strictly to "
            "`hasRespiratorySensitivity: true`.\n"
            "4. Write a warm 1-sentence `summaryNote` confirming what was understood (zero judgment)."
        )

        try:
            parsed = self._llm.generate_structured(
                system_prompt=system_prompt,
                user_prompt=f"Household description:\n{cleaned}",
                response_schema=ParsedHouseholdDraft,
            )
            parsed.fallback_used = False
            if not parsed.members:
                parsed.members = [
                    ParsedMemberDraft(nickname="Me", role="working_adult", age_group="18_45")
                ]
            log_event("profile_ai_parsed", member_count=len(parsed.members), fallback=False)
            return parsed
        except UpstreamProviderError as exc:
            log_event(
                "profile_ai_parse_fallback",
                level=logging.WARNING,
                error=str(exc),
            )
            return _deterministic_parse_fallback(cleaned)

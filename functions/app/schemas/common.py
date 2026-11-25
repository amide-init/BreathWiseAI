"""Shared base Pydantic schemas, enums, citations, and health response."""

from __future__ import annotations

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


def to_camel(field_name: str) -> str:
    """Convert snake_case Python attribute names to camelCase JSON keys."""
    parts = field_name.split("_")
    return parts[0] + "".join(word.capitalize() for word in parts[1:])


class ApiModel(BaseModel):
    """Base Pydantic v2 model with camelCase wire aliases and strict whitespace stripping."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        str_strip_whitespace=True,
    )


class FreshnessStatus(StrEnum):
    """Mandatory environmental data freshness states (PRD §9)."""

    FRESH = "fresh"
    STALE = "stale"
    UNAVAILABLE = "unavailable"


class AqiCategory(StrEnum):
    """India CPCB National Air Quality Index categories + Unavailable."""

    GOOD = "Good"
    SATISFACTORY = "Satisfactory"
    MODERATE = "Moderate"
    POOR = "Poor"
    VERY_POOR = "Very Poor"
    SEVERE = "Severe"
    UNAVAILABLE = "Unavailable"


class Citation(ApiModel):
    """Reference to a verified knowledge_base document."""

    doc_id: str
    title: str
    source_authority: str
    source_url: str | None = None


class QuickDecision(ApiModel):
    """Plain-human everyday verdict derived deterministically from CPCB NAQI & profile."""

    id: Literal["exercise", "kids_play", "windows", "mask"]
    label: str
    status: Literal["good", "caution", "avoid", "unknown"]
    verdict: str
    short_reason: str


class HealthCheckResponse(ApiModel):
    """Response payload for GET /api/v1/health."""

    status: str = Field(default="ok")
    service: str
    version: str
    environment: str
    timestamp: str

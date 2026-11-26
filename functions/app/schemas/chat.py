"""Conversational AI assistant schemas (PRD Module 6)."""

from __future__ import annotations

from pydantic import Field

from app.schemas.common import ApiModel, Citation
from app.schemas.environment import CurrentAirQuality


class ChatRequest(ApiModel):
    """Request payload for POST /api/v1/chat/message."""

    session_id: str | None = None
    family_id: str | None = None
    location_id: str
    message: str = Field(min_length=1, max_length=1000)


class ChatReply(ApiModel):
    """Structured assistant response with citations, reasoning trace, and grounding metadata."""

    content: str
    follow_up_suggestions: list[str] = Field(default_factory=list)
    citations: list[Citation] = Field(default_factory=list)
    environmental_snapshot: CurrentAirQuality | None = None
    agent_trace: list[str] = Field(default_factory=list)
    medical_disclaimer_shown: bool = False
    fallback_mode: bool = False


class ChatResponse(ApiModel):
    """HTTP response envelope for POST /api/v1/chat/message."""

    session_id: str
    message_id: str
    reply: ChatReply

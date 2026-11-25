"""Canonical Pydantic v2 UserModel & editable UserUpdateInput for Firestore `users/{uid}`."""

from __future__ import annotations

from enum import StrEnum

from pydantic import Field

from app.schemas.common import ApiModel
from app.schemas.environment import LocationResult


class AqiScalePreference(StrEnum):
    """Supported AQI display scale preferences."""

    CPCB_NAQI = "CPCB_NAQI"
    US_EPA = "US_EPA"


class UserModel(ApiModel):
    """Mirrors Firestore `users/{uid}` schema defined in docs/DATA_MODEL.md & firestore.rules."""

    uid: str = Field(min_length=1, max_length=128)
    display_name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=254)
    default_family_id: str | None = Field(default=None, max_length=128)
    primary_location: LocationResult | None = None
    aqi_scale_preference: AqiScalePreference = AqiScalePreference.CPCB_NAQI
    onboarding_completed: bool = False
    created_at: str | None = None
    updated_at: str | None = None


class UserUpdateInput(ApiModel):
    """Editable subset of `users/{uid}` fields (excludes immutable uid/email/createdAt)."""

    display_name: str | None = Field(default=None, min_length=1, max_length=100)
    default_family_id: str | None = Field(default=None, max_length=128)
    primary_location: LocationResult | None = None
    aqi_scale_preference: AqiScalePreference | None = None
    onboarding_completed: bool | None = None

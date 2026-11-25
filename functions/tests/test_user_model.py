"""Unit tests for canonical UserModel and UserUpdateInput schemas."""

from __future__ import annotations

import pytest
from pydantic import ValidationError as PydanticValidationError

from app.schemas.user import AqiScalePreference, UserModel, UserUpdateInput


def test_user_model_camel_case_round_trip() -> None:
    user = UserModel.model_validate(
        {
            "uid": "u_123",
            "displayName": "Amina Sharma",
            "email": "amina@example.com",
            "aqiScalePreference": "CPCB_NAQI",
            "onboardingCompleted": False,
        }
    )
    dumped = user.model_dump(by_alias=True)
    assert dumped["uid"] == "u_123"
    assert dumped["displayName"] == "Amina Sharma"
    assert dumped["aqiScalePreference"] == "CPCB_NAQI"


def test_user_update_input_tracks_only_provided_editable_fields() -> None:
    patch = UserUpdateInput(
        display_name="Rohan",
        aqi_scale_preference=AqiScalePreference.US_EPA,
    )
    dumped = patch.model_dump(by_alias=True, exclude_unset=True)
    assert dumped == {"displayName": "Rohan", "aqiScalePreference": "US_EPA"}
    assert "uid" not in dumped
    assert "email" not in dumped


def test_user_model_rejects_empty_display_name() -> None:
    with pytest.raises(PydanticValidationError):
        UserModel(uid="u_1", display_name="   ", email="a@b.com")

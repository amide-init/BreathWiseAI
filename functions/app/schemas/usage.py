"""Per-user lifetime rate-limit & account usage summary schemas."""

from __future__ import annotations

from typing import Literal

from pydantic import Field

from app.schemas.common import ApiModel

UsageBucketKey = Literal[
    "chatMessages",
    "dailyPlans",
    "indoorAssessments",
    "profileParses",
    "impactLogs",
]


class UsageCategoryItem(ApiModel):
    """Lifetime usage breakdown for a single rate-limited user feature."""

    key: UsageBucketKey
    label: str
    description: str
    used: int = Field(ge=0)
    limit: int = Field(ge=1)
    remaining: int = Field(ge=0)
    percent_used: int = Field(ge=0, le=100)


class UserUsageSummary(ApiModel):
    """Lifetime account usage and quota status returned to the Settings Usage dashboard."""

    quota_scope: Literal["lifetime"] = "lifetime"
    burst_limit_per_minute: int = Field(ge=1)
    total_used: int = Field(ge=0)
    total_limit: int = Field(ge=1)
    categories: list[UsageCategoryItem] = Field(default_factory=list)

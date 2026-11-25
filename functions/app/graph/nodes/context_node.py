"""Node 1: Context Agent — fetches household profile and strips PII before AI processing."""

from __future__ import annotations

from app.graph.state import BreatheWiseState
from app.repositories.family_repo import FamilyAggregate, FamilyRepository
from app.schemas.profile import SanitizedContext


def sanitize_family_aggregate(
    family: FamilyAggregate | None,
    *,
    fallback_location_label: str = "",
) -> SanitizedContext:
    """Project Firestore family & member records into a strictly PII-free context object.

    Strips raw nicknames, emails, and free-text medical notes while preserving
    role/age-group descriptors, schedules, commute/exercise habits, equipment, and
    boolean sensitivity flags.
    """
    if family is None:
        return SanitizedContext(
            profile_complete=False,
            location_label=fallback_location_label,
        )

    descriptors: list[str] = []
    has_children = False
    has_toddlers = False
    has_elderly = False
    has_sensitivity = False

    for member in family.members:
        descriptors.append(f"{member.role} ({member.age_group})")
        if member.role == "child_toddler" or member.age_group == "0_5":
            has_toddlers = True
            has_children = True
        elif member.role == "child_school" or member.age_group in ("6_12", "13_17"):
            has_children = True
        if member.role == "elderly" or member.age_group == "60_plus":
            has_elderly = True

        hp = member.optional_health_profile
        if hp and (hp.has_respiratory_sensitivity or hp.has_cardiac_sensitivity or hp.is_pregnant):
            has_sensitivity = True

    return SanitizedContext(
        profile_complete=True,
        location_label=family.location_label or fallback_location_label,
        member_descriptors=descriptors,
        has_children=has_children,
        has_toddlers=has_toddlers,
        has_elderly=has_elderly,
        has_respiratory_or_cardiac_sensitivity=has_sensitivity,
        primary_commute_mode=family.transportation.primary_mode,
        daily_commute_km=family.transportation.daily_commute_km,
        prefers_outdoor_exercise=family.exercise.prefers_outdoor,
        exercise_window=family.exercise.preferred_window,
        indoor_equipment=family.indoor_equipment,
    )


def build_context_node(family_repo: FamilyRepository | None = None):
    """Create Node 1 (`context_agent`) with injectable FamilyRepository."""
    repo = family_repo or FamilyRepository()

    def context_agent(state: BreatheWiseState) -> dict[str, object]:
        family = repo.get_family_for_user(
            uid=state["user_id"],
            family_id=state.get("family_id"),
        )
        sanitized = sanitize_family_aggregate(
            family,
            fallback_location_label=state.get("location_label", ""),
        )
        return {
            "resolved_family_id": family.family_id if family else state.get("family_id"),
            "sanitized_context": sanitized,
        }

    return context_agent

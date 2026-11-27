"""Node 1: Context Agent — fetches household profile and strips PII before AI processing."""

from __future__ import annotations

from app.graph.state import BreatheWiseState
from app.repositories.family_repo import FamilyAggregate, FamilyRepository
from app.schemas.profile import SanitizedContext


def sanitize_family_aggregate(
    family: FamilyAggregate | None,
    *,
    fallback_location_label: str = "",
    current_time_window: str | None = None,
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
            current_time_window=current_time_window,
        )

    descriptors: list[str] = []
    schedule_hints: list[str] = []
    has_children = False
    has_toddlers = False
    has_elderly = False
    has_sensitivity = False

    for member in family.members:
        role_label = member.role.replace("_", " ")
        hp = member.optional_health_profile
        member_tags: list[str] = [member.age_group]
        if hp:
            if hp.has_respiratory_sensitivity:
                member_tags.append("respiratory sensitivity")
            if hp.has_cardiac_sensitivity:
                member_tags.append("cardiac sensitivity")
            if hp.is_pregnant:
                member_tags.append("pregnant")
        if member.commute_mode:
            member_tags.append(f"commute: {member.commute_mode}")
        descriptors.append(f"{member.role} ({', '.join(member_tags)})")

        if (
            member.schedule.leave_home_time
            or member.schedule.return_home_time
            or member.schedule.outdoor_play_or_exercise_time
        ):
            parts: list[str] = []
            if member.schedule.leave_home_time:
                parts.append(f"leaves ~{member.schedule.leave_home_time}")
            if member.schedule.return_home_time:
                parts.append(f"returns ~{member.schedule.return_home_time}")
            if member.schedule.outdoor_play_or_exercise_time:
                parts.append(f"outdoor ~{member.schedule.outdoor_play_or_exercise_time}")
            schedule_hints.append(f"{role_label}: {', '.join(parts)}")
        if member.role == "child_toddler" or member.age_group == "0_5":
            has_toddlers = True
            has_children = True
        elif member.role == "child_school" or member.age_group in ("6_12", "13_17"):
            has_children = True
        if member.role == "elderly" or member.age_group == "60_plus":
            has_elderly = True

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
        exercise_activity_type=family.exercise.activity_type,
        member_schedule_hints=schedule_hints[:6],
        current_time_window=current_time_window,
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
            current_time_window=state.get("current_time_window"),
        )
        return {
            "resolved_family_id": family.family_id if family else state.get("family_id"),
            "sanitized_context": sanitized,
        }

    return context_agent

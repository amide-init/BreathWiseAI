"""Firestore repository for `families/{familyId}` and `families/{familyId}/members/{memberId}`."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from firebase_admin import firestore

from app.repositories.base_repo import BaseFirestoreRepository
from app.schemas.planner import IndoorQuestionnaire
from app.schemas.profile import (
    ExercisePreferences,
    FamilyMember,
    IndoorEquipment,
    MemberSchedule,
    OptionalHealthProfile,
    TransportationHabits,
)
from app.utils.datetime_utils import to_iso_utc, utc_now
from app.utils.logger import log_event
from app.utils.ttl_cache import FAMILY_L1_CACHE, INDOOR_L1_CACHE


@dataclass(frozen=True, slots=True)
class FamilyAggregate:
    """Loaded household profile and member list owned by a user."""

    family_id: str
    owner_user_id: str
    household_name: str
    location_label: str
    transportation: TransportationHabits
    exercise: ExercisePreferences
    indoor_equipment: IndoorEquipment
    members: list[FamilyMember]


class FamilyRepository(BaseFirestoreRepository):
    """Owner-verified Firestore reads for household & member context with 60s L1 cache."""

    COLLECTION = "families"

    def __init__(self, db_client: Any | None = None, *, use_l1_cache: bool | None = None) -> None:
        super().__init__(db_client=db_client)
        self._use_l1_cache = (db_client is None) if use_l1_cache is None else use_l1_cache

    def get_family_for_user(
        self,
        *,
        uid: str,
        family_id: str | None = None,
    ) -> FamilyAggregate | None:
        cache_key = f"{uid}:{family_id or 'default'}"
        if self._use_l1_cache:
            cached = FAMILY_L1_CACHE.get(cache_key)
            if isinstance(cached, FamilyAggregate):
                return cached

        try:
            doc_snap = self._find_family_doc(uid=uid, family_id=family_id)
            if doc_snap is None or not doc_snap.exists:
                return None

            data = doc_snap.to_dict() or {}
            if data.get("ownerUserId") != uid:
                return None

            member_snaps = (
                self.db.collection(self.COLLECTION)
                .document(doc_snap.id)
                .collection("members")
                .where("ownerUserId", "==", uid)
                .stream()
            )
            members = [_parse_member(m.id, m.to_dict() or {}) for m in member_snaps if m.exists]

            loc = data.get("location") if isinstance(data.get("location"), dict) else {}
            aggregate = FamilyAggregate(
                family_id=doc_snap.id,
                owner_user_id=uid,
                household_name=str(data.get("householdName") or "Household"),
                location_label=str(loc.get("label") or loc.get("city") or ""),
                transportation=TransportationHabits.model_validate(
                    data.get("transportationHabits") or {}
                ),
                exercise=ExercisePreferences.model_validate(data.get("exercisePreferences") or {}),
                indoor_equipment=IndoorEquipment.model_validate(data.get("indoorEquipment") or {}),
                members=members,
            )
            if self._use_l1_cache:
                FAMILY_L1_CACHE.set(cache_key, aggregate)
                FAMILY_L1_CACHE.set(f"{uid}:{aggregate.family_id}", aggregate)
            return aggregate
        except Exception as exc:  # noqa: BLE001
            log_event(
                "family_profile_read_failed",
                level=logging.WARNING,
                error=str(exc),
            )
            return None

    def _find_family_doc(self, *, uid: str, family_id: str | None) -> Any | None:
        if family_id:
            snap = self.db.collection(self.COLLECTION).document(family_id).get()
            if snap.exists and (snap.to_dict() or {}).get("ownerUserId") == uid:
                return snap

        snaps = list(
            self.db.collection(self.COLLECTION).where("ownerUserId", "==", uid).limit(1).stream()
        )
        return snaps[0] if snaps else None

    def save_indoor_questionnaire(
        self,
        *,
        uid: str,
        family_id: str,
        questionnaire: IndoorQuestionnaire,
    ) -> bool:
        """Persist questionnaire baseline on `families/{familyId}` after ownership check."""
        try:
            doc_ref = self.db.collection(self.COLLECTION).document(family_id)
            snap = doc_ref.get()
            if not snap.exists or (snap.to_dict() or {}).get("ownerUserId") != uid:
                return False
            q_payload = questionnaire.model_dump(by_alias=True)
            q_payload["completedAt"] = to_iso_utc(utc_now())
            doc_ref.update(
                {
                    "indoorQuestionnaire": q_payload,
                    "updatedAt": firestore.SERVER_TIMESTAMP,
                }
            )
            FAMILY_L1_CACHE.invalidate_prefix(f"{uid}:")
            INDOOR_L1_CACHE.invalidate_prefix(f"{uid}:")
            return True
        except Exception as exc:  # noqa: BLE001
            log_event(
                "indoor_questionnaire_save_failed",
                level=logging.WARNING,
                family_id=family_id,
                error=str(exc),
            )
            return False


def _parse_member(member_id: str, data: dict[str, Any]) -> FamilyMember:
    schedule_raw = data.get("schedule")
    health_raw = data.get("optionalHealthProfile")
    return FamilyMember(
        member_id=member_id,
        nickname=str(data.get("nickname") or "Member"),
        role=str(data.get("role") or "working_adult"),
        age_group=str(data.get("ageGroup") or "18_45"),
        schedule=MemberSchedule.model_validate(schedule_raw)
        if isinstance(schedule_raw, dict)
        else MemberSchedule(),
        commute_mode=data.get("commuteMode"),
        optional_health_profile=OptionalHealthProfile.model_validate(health_raw)
        if isinstance(health_raw, dict)
        else None,
    )

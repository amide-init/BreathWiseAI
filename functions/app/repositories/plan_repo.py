"""Firestore repository for AI-generated `users/{uid}/daily_plans/{planDate}_{locationId}`."""

from __future__ import annotations

import logging
import re
import uuid
from typing import Any

from firebase_admin import firestore

from app.repositories.base_repo import BaseFirestoreRepository
from app.utils.datetime_utils import to_iso_utc, utc_now
from app.utils.logger import log_event

_SAFE_ID_RE = re.compile(r"[^a-zA-Z0-9._-]")


def make_daily_plan_doc_id(plan_date: str | None, location_id: str | None) -> str:
    """Deterministic O(1) document ID (`{planDate}_{locationId}`) inside `users/{uid}/daily_plans`."""
    if plan_date and location_id:
        safe_date = _SAFE_ID_RE.sub("", plan_date)[:16]
        safe_loc = _SAFE_ID_RE.sub("_", location_id)[:80]
        if safe_date and safe_loc:
            return f"{safe_date}_{safe_loc}"
    return f"plan_{uuid.uuid4().hex[:12]}"


class DailyPlanRepository(BaseFirestoreRepository):
    """Persists and retrieves user-owned daily clean-air plans under `users/{uid}/daily_plans`."""

    USERS_COLLECTION = "users"
    COLLECTION = "daily_plans"

    def _plans_col(self, user_id: str) -> Any:
        return self.db.collection(self.USERS_COLLECTION).document(user_id).collection(self.COLLECTION)

    def save_plan(self, *, user_id: str, plan_payload: dict[str, Any]) -> dict[str, Any]:
        plan_id = str(
            plan_payload.get("planId")
            or make_daily_plan_doc_id(
                plan_payload.get("planDate"),
                plan_payload.get("locationId"),
            )
        )
        now_iso = to_iso_utc(utc_now())
        record = {
            **plan_payload,
            "planId": plan_id,
            "userId": user_id,
            "completedItemIds": list(plan_payload.get("completedItemIds") or []),
            "createdAt": now_iso,
        }
        try:
            doc_to_write = dict(record)
            doc_to_write["createdAt"] = firestore.SERVER_TIMESTAMP
            self._plans_col(user_id).document(plan_id).set(doc_to_write)
        except Exception as exc:  # noqa: BLE001
            log_event(
                "daily_plan_save_failed",
                level=logging.WARNING,
                plan_id=plan_id,
                error=str(exc),
            )
        return record

    def get_latest_plan_for_date(
        self,
        *,
        user_id: str,
        plan_date: str,
        location_id: str | None = None,
    ) -> dict[str, Any] | None:
        try:
            plans_col = self._plans_col(user_id)
            # O(1) direct document read when location_id is known (zero composite index needed!)
            if location_id:
                doc_id = make_daily_plan_doc_id(plan_date, location_id)
                snap = plans_col.document(doc_id).get()
                if snap.exists:
                    data = snap.to_dict() or {}
                    data["planId"] = snap.id
                    created = data.get("createdAt")
                    if hasattr(created, "isoformat"):
                        data["createdAt"] = to_iso_utc(created)
                    return data
                return None

            snaps = list(
                plans_col.where("planDate", "==", plan_date)
                .order_by("createdAt", direction=firestore.Query.DESCENDING)
                .limit(1)
                .stream()
            )
            if not snaps:
                return None
            snap = snaps[0]
            data = snap.to_dict() or {}
            data["planId"] = snap.id
            created = data.get("createdAt")
            if hasattr(created, "isoformat"):
                data["createdAt"] = to_iso_utc(created)
            return data
        except Exception as exc:  # noqa: BLE001
            log_event(
                "daily_plan_read_failed",
                level=logging.WARNING,
                error=str(exc),
            )
            return None

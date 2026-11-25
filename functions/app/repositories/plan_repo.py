"""Firestore repository for AI-generated `daily_plans/{planId}` documents."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from firebase_admin import firestore

from app.repositories.base_repo import BaseFirestoreRepository
from app.utils.datetime_utils import to_iso_utc, utc_now
from app.utils.logger import log_event


class DailyPlanRepository(BaseFirestoreRepository):
    """Persists and retrieves user-owned daily clean-air plans via Admin SDK."""

    COLLECTION = "daily_plans"

    def save_plan(self, *, user_id: str, plan_payload: dict[str, Any]) -> dict[str, Any]:
        plan_id = str(plan_payload.get("planId") or f"plan_{uuid.uuid4().hex[:12]}")
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
            self.db.collection(self.COLLECTION).document(plan_id).set(doc_to_write)
        except Exception as exc:  # noqa: BLE001
            log_event(
                "daily_plan_save_failed",
                level=logging.WARNING,
                plan_id=plan_id,
                error=str(exc),
            )
        return record

    def get_latest_plan_for_date(self, *, user_id: str, plan_date: str) -> dict[str, Any] | None:
        try:
            snaps = list(
                self.db.collection(self.COLLECTION)
                .where("userId", "==", user_id)
                .where("planDate", "==", plan_date)
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

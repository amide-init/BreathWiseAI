"""Firestore repository for `impact_logs/{logId}` sustainability & exposure records (FR-10)."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from firebase_admin import firestore

from app.repositories.base_repo import BaseFirestoreRepository
from app.utils.datetime_utils import to_iso_utc, utc_now
from app.utils.logger import log_event


class ImpactRepository(BaseFirestoreRepository):
    """Persists, reads, and deletes user-owned impact logs via Admin SDK."""

    COLLECTION = "impact_logs"

    def save_log(self, *, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        """Persist a deterministically calculated impact log document."""
        log_id = str(payload.get("logId") or f"imp_{uuid.uuid4().hex[:12]}")
        now_iso = to_iso_utc(utc_now())
        record: dict[str, Any] = {
            **payload,
            "logId": log_id,
            "userId": user_id,
            "createdAt": now_iso,
        }
        try:
            doc_to_write = dict(record)
            doc_to_write["createdAt"] = firestore.SERVER_TIMESTAMP
            self.db.collection(self.COLLECTION).document(log_id).set(doc_to_write)
        except Exception as exc:  # noqa: BLE001
            log_event(
                "impact_log_save_failed",
                level=logging.WARNING,
                log_id=log_id,
                error=str(exc),
            )
        return record

    def list_logs(self, *, user_id: str, start_date: str | None = None) -> list[dict[str, Any]]:
        """List all impact logs owned by `user_id`, optionally filtered by `loggedDate >= start_date`."""
        try:
            snaps = list(
                self.db.collection(self.COLLECTION).where("userId", "==", user_id).stream()
            )
            records: list[dict[str, Any]] = []
            for snap in snaps:
                if not snap.exists:
                    continue
                data = snap.to_dict() or {}
                data["logId"] = snap.id
                created = data.get("createdAt")
                if hasattr(created, "isoformat"):
                    data["createdAt"] = to_iso_utc(created)
                logged_date = str(data.get("loggedDate") or "")
                if start_date and logged_date and logged_date < start_date:
                    continue
                records.append(data)

            records.sort(
                key=lambda item: (
                    str(item.get("loggedDate") or ""),
                    str(item.get("createdAt") or ""),
                ),
                reverse=True,
            )
            return records
        except Exception as exc:  # noqa: BLE001
            log_event(
                "impact_log_list_failed",
                level=logging.WARNING,
                error=str(exc),
            )
            return []

    def delete_log(self, *, user_id: str, log_id: str) -> bool:
        """Delete a single impact log after verifying strict ownership."""
        doc_ref = self.db.collection(self.COLLECTION).document(log_id)
        snap = doc_ref.get()
        if not snap.exists:
            return False
        data = snap.to_dict() or {}
        if data.get("userId") != user_id:
            return False
        doc_ref.delete()
        return True

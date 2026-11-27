"""Firestore repository for atomic per-user lifetime quota counters (`user_usage/{uid}`).

Strictly Admin-SDK-only (blocked to clients via default catch-all in firestore.rules)
so users can never tamper with or reset their own account quota counters.
"""

from __future__ import annotations

import logging
from typing import Any

from firebase_admin import firestore

from app.repositories.base_repo import BaseFirestoreRepository
from app.utils.logger import log_event


class UsageRepository(BaseFirestoreRepository):
    """Atomic Firestore transaction counter per user account (lifetime scope)."""

    COLLECTION = "user_usage"

    @staticmethod
    def doc_id(user_id: str) -> str:
        return user_id

    def check_and_increment(
        self,
        *,
        user_id: str,
        bucket: str,
        limit: int,
    ) -> tuple[int, bool]:
        """Atomically verify `used < limit` and increment `counts.{bucket}` for `user_id`.

        Returns `(count_after_check, allowed)`. Fails open on transient Firestore outages
        so a database hiccup never causes a false lockout.
        """
        try:
            db = self.db
            doc_ref = db.collection(self.COLLECTION).document(self.doc_id(user_id))
            transaction = db.transaction()

            @firestore.transactional
            def _txn(txn: Any) -> tuple[int, bool]:
                snap = doc_ref.get(transaction=txn)
                data = snap.to_dict() if snap.exists else {}
                counts = dict(data.get("counts") or {}) if isinstance(data, dict) else {}
                current = int(counts.get(bucket) or 0)
                if current >= limit:
                    return current, False

                next_count = current + 1
                counts[bucket] = next_count
                total_used = sum(int(v or 0) for v in counts.values())
                txn.set(
                    doc_ref,
                    {
                        "userId": user_id,
                        "quotaScope": "lifetime",
                        "counts": counts,
                        "totalUsed": total_used,
                        "updatedAt": firestore.SERVER_TIMESTAMP,
                    },
                    merge=True,
                )
                return next_count, True

            return _txn(transaction)
        except Exception as exc:  # noqa: BLE001
            log_event(
                "usage_quota_check_failed_open",
                level=logging.WARNING,
                bucket=bucket,
                error=str(exc),
            )
            return 0, True

    def get_lifetime_counts(self, *, user_id: str) -> dict[str, int]:
        """Read lifetime usage counts for `user_id` (zeros when no doc exists yet)."""
        try:
            snap = self.db.collection(self.COLLECTION).document(self.doc_id(user_id)).get()
            if not snap.exists:
                return {}
            data = snap.to_dict() or {}
            raw_counts = data.get("counts")
            if not isinstance(raw_counts, dict):
                return {}
            return {str(k): max(0, int(v or 0)) for k, v in raw_counts.items()}
        except Exception as exc:  # noqa: BLE001
            log_event(
                "usage_summary_read_failed",
                level=logging.WARNING,
                error=str(exc),
            )
            return {}

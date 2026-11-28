"""Firestore repository for `users/{uid}/chat_sessions/{sessionId}/messages/{messageId}` (FR-08)."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from firebase_admin import firestore

from app.repositories.base_repo import BaseFirestoreRepository
from app.utils.datetime_utils import to_iso_utc, utc_now
from app.utils.logger import log_event


class ChatRepository(BaseFirestoreRepository):
    """Persists and reads user-owned chat sessions & messages under `users/{uid}/chat_sessions`."""

    USERS_COLLECTION = "users"
    SESSIONS_COLLECTION = "chat_sessions"
    MESSAGES_SUBCOLLECTION = "messages"

    def _sessions_col(self, user_id: str) -> Any:
        return (
            self.db.collection(self.USERS_COLLECTION)
            .document(user_id)
            .collection(self.SESSIONS_COLLECTION)
        )

    def ensure_session(
        self,
        *,
        user_id: str,
        session_id: str | None,
        family_id: str | None,
        location_id: str,
        first_message: str,
    ) -> str:
        """Return existing verified session ID or create a new session under `users/{uid}/chat_sessions`."""
        sessions_col = self._sessions_col(user_id)
        if session_id:
            try:
                snap = sessions_col.document(session_id).get()
                if snap.exists:
                    return session_id
            except Exception as exc:  # noqa: BLE001
                log_event(
                    "chat_session_lookup_failed",
                    level=logging.WARNING,
                    error=str(exc),
                )

        new_session_id = f"chat_{uuid.uuid4().hex[:12]}"
        title = first_message.strip().replace("\n", " ")[:80] or "Clean-Air Conversation"
        payload: dict[str, Any] = {
            "userId": user_id,
            "familyId": family_id,
            "locationId": location_id,
            "title": title,
            "createdAt": firestore.SERVER_TIMESTAMP,
            "updatedAt": firestore.SERVER_TIMESTAMP,
        }
        try:
            sessions_col.document(new_session_id).set(payload)
        except Exception as exc:  # noqa: BLE001
            log_event(
                "chat_session_create_failed",
                level=logging.WARNING,
                session_id=new_session_id,
                error=str(exc),
            )
        return new_session_id

    def get_recent_history(
        self,
        *,
        user_id: str,
        session_id: str,
        limit: int = 6,
    ) -> list[dict[str, str]]:
        """Load the most recent conversation turns in chronological order for prompt grounding."""
        try:
            snaps = list(
                self._sessions_col(user_id)
                .document(session_id)
                .collection(self.MESSAGES_SUBCOLLECTION)
                .order_by("createdAt", direction=firestore.Query.DESCENDING)
                .limit(limit)
                .stream()
            )
            turns: list[dict[str, str]] = []
            for snap in reversed(snaps):
                data = snap.to_dict() or {}
                role = str(data.get("role") or "")
                content = str(data.get("content") or "")
                if role in {"user", "assistant"} and content:
                    turns.append({"role": role, "content": content})
            return turns
        except Exception as exc:  # noqa: BLE001
            log_event(
                "chat_history_read_failed",
                level=logging.WARNING,
                session_id=session_id,
                error=str(exc),
            )
            return []

    def append_message(
        self,
        *,
        session_id: str,
        user_id: str,
        role: str,
        content: str,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Write a single chat turn under `users/{uid}/chat_sessions/{sessionId}/messages`."""
        message_id = f"msg_{uuid.uuid4().hex[:12]}"
        now_iso = to_iso_utc(utc_now())
        record: dict[str, Any] = {
            "messageId": message_id,
            "sessionId": session_id,
            "userId": user_id,
            "role": role,
            "content": content,
            "createdAt": now_iso,
            **(metadata or {}),
        }
        try:
            doc_to_write = dict(record)
            doc_to_write["createdAt"] = firestore.SERVER_TIMESTAMP
            session_ref = self._sessions_col(user_id).document(session_id)
            session_ref.collection(self.MESSAGES_SUBCOLLECTION).document(message_id).set(
                doc_to_write
            )
            session_ref.set({"updatedAt": firestore.SERVER_TIMESTAMP}, merge=True)
        except Exception as exc:  # noqa: BLE001
            log_event(
                "chat_message_save_failed",
                level=logging.WARNING,
                session_id=session_id,
                message_id=message_id,
                error=str(exc),
            )
        return record

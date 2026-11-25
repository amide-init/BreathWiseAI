"""Firestore repository for `users/{uid}` documents."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from firebase_admin import firestore

from app.repositories.base_repo import BaseFirestoreRepository
from app.schemas.user import UserModel, UserUpdateInput
from app.utils.datetime_utils import to_iso_utc


class UserRepository(BaseFirestoreRepository):
    """Read and update `users/{uid}` using typed Pydantic models."""

    COLLECTION = "users"

    def get_by_id(self, uid: str) -> UserModel | None:
        snap = self.db.collection(self.COLLECTION).document(uid).get()
        if not snap.exists:
            return None
        return _doc_to_user_model(uid, snap.to_dict() or {})

    def upsert_user(self, user: UserModel) -> UserModel:
        doc_ref = self.db.collection(self.COLLECTION).document(user.uid)
        snap = doc_ref.get()
        data = user.model_dump(by_alias=True, exclude={"created_at", "updated_at"})
        data["updatedAt"] = firestore.SERVER_TIMESTAMP
        if not snap.exists:
            data["createdAt"] = firestore.SERVER_TIMESTAMP
            doc_ref.set(data)
        else:
            doc_ref.set(data, merge=True)
        refreshed = self.get_by_id(user.uid)
        return refreshed or user

    def update_user(self, uid: str, update_input: UserUpdateInput) -> UserModel | None:
        payload = update_input.model_dump(by_alias=True, exclude_unset=True)
        if not payload:
            return self.get_by_id(uid)
        payload["updatedAt"] = firestore.SERVER_TIMESTAMP
        self.db.collection(self.COLLECTION).document(uid).update(payload)
        return self.get_by_id(uid)


def _coerce_iso(value: Any) -> str | None:
    if isinstance(value, datetime):
        return to_iso_utc(value)
    if isinstance(value, str):
        return value
    return None


def _doc_to_user_model(uid: str, data: dict[str, Any]) -> UserModel:
    normalized = dict(data)
    normalized.setdefault("uid", uid)
    normalized["createdAt"] = _coerce_iso(data.get("createdAt"))
    normalized["updatedAt"] = _coerce_iso(data.get("updatedAt"))
    return UserModel.model_validate(normalized)

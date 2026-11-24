"""Shared Firebase Admin initialization and base Firestore repository helpers."""

from __future__ import annotations

from typing import Any

import firebase_admin
from firebase_admin import firestore


def ensure_firebase_app() -> firebase_admin.App:
    """Idempotently initialize Firebase Admin SDK once per Cloud Function instance."""
    try:
        return firebase_admin.get_app()
    except ValueError:
        return firebase_admin.initialize_app()


class BaseFirestoreRepository:
    """Reusable base class providing lazy Firestore client access."""

    def __init__(self, db_client: Any | None = None) -> None:
        self._db = db_client

    @property
    def db(self) -> Any:
        if self._db is None:
            ensure_firebase_app()
            self._db = firestore.client()
        return self._db

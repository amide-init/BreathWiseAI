"""Firestore repository for verified `knowledge_base/{docId}` RAG documents."""

from __future__ import annotations

import logging
from typing import Any

from firebase_admin import firestore

from app.rag.seed_data import VERIFIED_KNOWLEDGE_DOCS, KnowledgeDocument
from app.repositories.base_repo import BaseFirestoreRepository
from app.utils.logger import log_event
from app.utils.ttl_cache import KNOWLEDGE_L1_CACHE

_KNOWLEDGE_CACHE_KEY = "all_docs"


class KnowledgeRepository(BaseFirestoreRepository):
    """Reads verified RAG documents from Firestore with L1 TTL caching and seed fallback."""

    COLLECTION = "knowledge_base"

    def __init__(self, db_client: Any | None = None, *, use_l1_cache: bool | None = None) -> None:
        super().__init__(db_client=db_client)
        self._use_l1_cache = (db_client is None) if use_l1_cache is None else use_l1_cache

    def list_documents(self) -> list[KnowledgeDocument]:
        """Return all verified knowledge_base docs (30-min L1 cache + bundled seed fallback)."""
        if self._use_l1_cache:
            cached = KNOWLEDGE_L1_CACHE.get(_KNOWLEDGE_CACHE_KEY)
            if isinstance(cached, list) and cached:
                return list(cached)  # type: ignore[arg-type]

        try:
            snaps = list(self.db.collection(self.COLLECTION).limit(50).stream())
            if not snaps:
                docs = list(VERIFIED_KNOWLEDGE_DOCS)
            else:
                docs = [_doc_from_dict(snap.id, snap.to_dict() or {}) for snap in snaps]
            if self._use_l1_cache:
                KNOWLEDGE_L1_CACHE.set(_KNOWLEDGE_CACHE_KEY, list(docs))
            return docs
        except Exception as exc:  # noqa: BLE001
            log_event(
                "knowledge_base_read_fallback",
                level=logging.WARNING,
                error=str(exc),
            )
            return list(VERIFIED_KNOWLEDGE_DOCS)

    def seed_documents(self) -> int:
        """Idempotently upsert all verified RAG seed documents into Firestore."""
        batch = self.db.batch()
        for doc in VERIFIED_KNOWLEDGE_DOCS:
            ref = self.db.collection(self.COLLECTION).document(doc.doc_id)
            batch.set(
                ref,
                {
                    "docId": doc.doc_id,
                    "title": doc.title,
                    "topic": doc.topic,
                    "applicableRiskTiers": list(doc.applicable_risk_tiers),
                    "content": doc.content,
                    "sourceAuthority": doc.source_authority,
                    "sourceUrl": doc.source_url,
                    "version": doc.version,
                    "updatedAt": firestore.SERVER_TIMESTAMP,
                },
                merge=True,
            )
        batch.commit()
        KNOWLEDGE_L1_CACHE.invalidate(_KNOWLEDGE_CACHE_KEY)
        return len(VERIFIED_KNOWLEDGE_DOCS)


def _doc_from_dict(doc_id: str, data: dict[str, Any]) -> KnowledgeDocument:
    tiers = data.get("applicableRiskTiers") or ["All"]
    return KnowledgeDocument(
        doc_id=str(data.get("docId") or doc_id),
        title=str(data.get("title") or doc_id),
        topic=str(data.get("topic") or "aqi_health"),
        applicable_risk_tiers=tuple(str(t) for t in tiers),
        content=str(data.get("content") or ""),
        source_authority=str(data.get("sourceAuthority") or "Verified Public Health Guidance"),
        source_url=str(data.get("sourceUrl") or ""),
        version=str(data.get("version") or "1.0"),
    )

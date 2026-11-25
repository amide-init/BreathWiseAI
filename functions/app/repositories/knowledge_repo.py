"""Firestore repository for verified `knowledge_base/{docId}` RAG documents."""

from __future__ import annotations

import logging
from typing import Any

from firebase_admin import firestore

from app.rag.seed_data import VERIFIED_KNOWLEDGE_DOCS, KnowledgeDocument
from app.repositories.base_repo import BaseFirestoreRepository
from app.utils.logger import log_event


class KnowledgeRepository(BaseFirestoreRepository):
    """Reads verified RAG documents from Firestore with safe fallback to bundled seed docs."""

    COLLECTION = "knowledge_base"

    def list_documents(self) -> list[KnowledgeDocument]:
        """Return all verified knowledge_base docs (falls back to bundled seed if unseeded/offline)."""
        try:
            snaps = list(self.db.collection(self.COLLECTION).limit(50).stream())
            if not snaps:
                return list(VERIFIED_KNOWLEDGE_DOCS)

            docs: list[KnowledgeDocument] = []
            for snap in snaps:
                data = snap.to_dict() or {}
                docs.append(_doc_from_dict(snap.id, data))
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

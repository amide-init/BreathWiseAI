"""Deterministic metadata + keyword RAG retriever over verified `knowledge_base/` docs."""

from __future__ import annotations

from app.rag.seed_data import KnowledgeDocument
from app.repositories.knowledge_repo import KnowledgeRepository
from app.schemas.common import AqiCategory, Citation

_MODE_DEFAULT_TOPICS: dict[str, set[str]] = {
    "daily_plan": {
        "aqi_health",
        "children_elderly",
        "indoor_air",
        "hepa_filtration",
        "commute_sustainability",
        "masks",
    },
    "indoor_advisor": {
        "indoor_air",
        "hepa_filtration",
        "cooking_ventilation",
        "aqi_health",
    },
    "chat": {
        "aqi_health",
        "children_elderly",
        "indoor_air",
        "hepa_filtration",
        "cooking_ventilation",
        "masks",
        "commute_sustainability",
        "medical_escalation",
    },
}

_QUERY_TOPIC_HINTS: dict[str, tuple[str, ...]] = {
    "children_elderly": ("child", "kid", "school", "play", "elderly", "senior", "grandparent"),
    "indoor_air": ("indoor", "window", "ventilat", "smog", "home", "room"),
    "hepa_filtration": ("hepa", "purifier", "filter", "air cleaner"),
    "cooking_ventilation": ("cook", "kitchen", "exhaust", "smoke", "incense", "dust", "sweep"),
    "masks": ("mask", "n95", "kn95", "ffp2", "respirator"),
    "commute_sustainability": (
        "commute",
        "carpool",
        "car",
        "metro",
        "bus",
        "drive",
        "co2",
        "cycle",
    ),
    "medical_escalation": (
        "cough",
        "wheez",
        "asthma",
        "inhaler",
        "chest",
        "breath",
        "doctor",
        "symptom",
    ),
}


class KnowledgeRetriever:
    """Fast deterministic retriever selecting top verified chunks for Node 4 grounding."""

    def __init__(self, repository: KnowledgeRepository | None = None) -> None:
        self._repo = repository or KnowledgeRepository()

    def retrieve(
        self,
        *,
        workflow_mode: str,
        risk_tier: AqiCategory,
        sensitive_groups_present: bool = False,
        medical_escalation_required: bool = False,
        user_query: str | None = None,
        top_k: int = 4,
    ) -> list[KnowledgeDocument]:
        docs = self._repo.list_documents()
        preferred_topics = set(
            _MODE_DEFAULT_TOPICS.get(workflow_mode, _MODE_DEFAULT_TOPICS["chat"])
        )
        lowered_query = (user_query or "").lower()
        query_words = {w for w in lowered_query.split() if len(w) >= 3}

        hinted_topics: set[str] = set()
        for topic, keywords in _QUERY_TOPIC_HINTS.items():
            if any(kw in lowered_query for kw in keywords):
                hinted_topics.add(topic)

        scored: list[tuple[int, KnowledgeDocument]] = []
        for doc in docs:
            score = 0
            if risk_tier.value in doc.applicable_risk_tiers:
                score += 4
            elif "All" in doc.applicable_risk_tiers:
                score += 2

            if doc.topic in preferred_topics:
                score += 3
            if doc.topic in hinted_topics:
                score += 6
            if sensitive_groups_present and doc.topic == "children_elderly":
                score += 4
            if medical_escalation_required and doc.topic == "medical_escalation":
                score += 10

            if query_words:
                haystack = f"{doc.title} {doc.content}".lower()
                overlap = sum(1 for w in query_words if w in haystack)
                score += min(overlap, 5)

            scored.append((score, doc))

        scored.sort(key=lambda pair: (-pair[0], pair[1].doc_id))
        return [doc for _, doc in scored[:top_k]]


def docs_to_citations(docs: list[KnowledgeDocument]) -> list[Citation]:
    """Convert retrieved knowledge chunks into verifiable API Citation objects."""
    return [
        Citation(
            doc_id=doc.doc_id,
            title=doc.title,
            source_authority=doc.source_authority,
            source_url=doc.source_url or None,
        )
        for doc in docs
    ]

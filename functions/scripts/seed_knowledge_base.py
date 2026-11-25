"""Idempotent CLI script to seed verified RAG documents into Cloud Firestore `knowledge_base/`."""

from __future__ import annotations

import sys
from pathlib import Path

# Allow running directly as `python scripts/seed_knowledge_base.py` from `functions/`
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.repositories.knowledge_repo import KnowledgeRepository


def main() -> None:
    count = KnowledgeRepository().seed_documents()
    print(f"Seeded {count} verified knowledge_base documents into Firestore.")


if __name__ == "__main__":
    main()

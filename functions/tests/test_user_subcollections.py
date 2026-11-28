"""Unit tests verifying Hybrid Root + `users/{uid}` subcollection Firestore paths."""

from __future__ import annotations

from typing import Any

from app.repositories.chat_repo import ChatRepository
from app.repositories.family_repo import FamilyRepository
from app.repositories.impact_repo import ImpactRepository
from app.repositories.plan_repo import DailyPlanRepository, make_daily_plan_doc_id
from app.repositories.usage_repo import UsageRepository


class _PathRecorderDoc:
    def __init__(self, path: str, store: dict[str, dict[str, Any]]) -> None:
        self._path = path
        self._store = store
        self.id = path.rsplit("/", 1)[-1]

    def collection(self, name: str) -> _PathRecorderCol:
        return _PathRecorderCol(f"{self._path}/{name}", self._store)

    def set(self, data: dict[str, Any], merge: bool = False) -> None:
        if merge and self._path in self._store:
            self._store[self._path] = {**self._store[self._path], **data}
        else:
            self._store[self._path] = dict(data)

    def update(self, data: dict[str, Any]) -> None:
        self._store[self._path] = {**self._store.get(self._path, {}), **data}

    def get(self, **_kwargs: Any) -> Any:
        exists = self._path in self._store
        data = dict(self._store.get(self._path, {}))
        return type("Snap", (), {"exists": exists, "id": self.id, "to_dict": lambda _s: data})()

    def delete(self) -> None:
        self._store.pop(self._path, None)


class _PathRecorderCol:
    def __init__(self, path: str, store: dict[str, dict[str, Any]]) -> None:
        self._path = path
        self._store = store

    def document(self, doc_id: str) -> _PathRecorderDoc:
        return _PathRecorderDoc(f"{self._path}/{doc_id}", self._store)

    def where(self, *_args: Any, **_kwargs: Any) -> _PathRecorderCol:
        return self

    def order_by(self, *_args: Any, **_kwargs: Any) -> _PathRecorderCol:
        return self

    def limit(self, *_args: Any, **_kwargs: Any) -> _PathRecorderCol:
        return self

    def stream(self) -> list[Any]:
        prefix = f"{self._path}/"
        snaps = []
        for k, v in self._store.items():
            if k.startswith(prefix) and "/" not in k[len(prefix) :]:
                doc_id = k[len(prefix) :]
                snaps.append(
                    type("Snap", (), {"exists": True, "id": doc_id, "to_dict": lambda _s, d=v: dict(d)})()
                )
        return snaps


class _FakeDb:
    def __init__(self) -> None:
        self.store: dict[str, dict[str, Any]] = {}

    def collection(self, name: str) -> _PathRecorderCol:
        return _PathRecorderCol(name, self.store)


def test_daily_plan_repo_uses_o1_deterministic_user_subcollection_path() -> None:
    db = _FakeDb()
    repo = DailyPlanRepository(db_client=db)

    doc_id = make_daily_plan_doc_id("2026-11-28", "new-delhi-in")
    assert doc_id == "2026-11-28_new-delhi-in"

    repo.save_plan(
        user_id="u1",
        plan_payload={
            "planDate": "2026-11-28",
            "locationId": "new-delhi-in",
            "locationName": "New Delhi",
            "sections": {},
        },
    )
    assert "users/u1/daily_plans/2026-11-28_new-delhi-in" in db.store

    fetched = repo.get_latest_plan_for_date(
        user_id="u1",
        plan_date="2026-11-28",
        location_id="new-delhi-in",
    )
    assert fetched is not None
    assert fetched["planId"] == "2026-11-28_new-delhi-in"
    assert fetched["locationName"] == "New Delhi"


def test_family_chat_impact_and_usage_repos_use_user_subcollections() -> None:
    db = _FakeDb()

    # Family + members under users/{uid}/families/{familyId}/members/{memberId}
    db.store["users/u1/families/fam_1"] = {
        "ownerUserId": "u1",
        "householdName": "Home",
        "location": {"city": "Pune", "label": "Pune, Maharashtra"},
    }
    db.store["users/u1/families/fam_1/members/m1"] = {
        "ownerUserId": "u1",
        "nickname": "Aarav",
        "role": "child_school",
        "ageGroup": "6_12",
    }
    fam_repo = FamilyRepository(db_client=db, use_l1_cache=False)
    agg = fam_repo.get_family_for_user(uid="u1", family_id="fam_1")
    assert agg is not None
    assert agg.family_id == "fam_1"
    assert len(agg.members) == 1
    assert agg.members[0].nickname == "Aarav"

    # Chat session + message under users/{uid}/chat_sessions/{sessionId}/messages/{messageId}
    chat_repo = ChatRepository(db_client=db)
    sid = chat_repo.ensure_session(
        user_id="u1",
        session_id=None,
        family_id="fam_1",
        location_id="pune-in",
        first_message="How is Pune air today?",
    )
    assert f"users/u1/chat_sessions/{sid}" in db.store
    msg = chat_repo.append_message(
        session_id=sid,
        user_id="u1",
        role="user",
        content="How is Pune air today?",
    )
    assert f"users/u1/chat_sessions/{sid}/messages/{msg['messageId']}" in db.store

    # Impact log under users/{uid}/impact_logs/{logId}
    imp_repo = ImpactRepository(db_client=db)
    saved = imp_repo.save_log(
        user_id="u1",
        payload={"impactDomain": "emissions_reduction", "actionType": "carpool", "loggedDate": "2026-11-28"},
    )
    assert f"users/u1/impact_logs/{saved['logId']}" in db.store
    assert len(imp_repo.list_logs(user_id="u1")) == 1
    assert imp_repo.delete_log(user_id="u1", log_id=saved["logId"]) is True
    assert f"users/u1/impact_logs/{saved['logId']}" not in db.store

    # Usage counter under users/{uid}/private/usage
    db.store["users/u1/private/usage"] = {"counts": {"chatMessages": 4}}
    usage_repo = UsageRepository(db_client=db)
    assert usage_repo.get_lifetime_counts(user_id="u1") == {"chatMessages": 4}

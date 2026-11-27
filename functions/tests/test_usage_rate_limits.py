"""Unit tests for per-user lifetime & burst rate limiting and Settings Usage summary."""

from __future__ import annotations

import pytest
from firebase_functions import https_fn

from app.services.usage_service import UsageService, clear_usage_runtime_caches
from app.utils.callable_utils import run_callable
from app.utils.errors import RateLimitError


class _InMemoryLifetimeUsageRepo:
    def __init__(self) -> None:
        self.store: dict[str, dict[str, int]] = {}

    def check_and_increment(
        self,
        *,
        user_id: str,
        bucket: str,
        limit: int,
    ) -> tuple[int, bool]:
        counts = self.store.setdefault(user_id, {})
        current = counts.get(bucket, 0)
        if current >= limit:
            return current, False
        counts[bucket] = current + 1
        return current + 1, True

    def get_lifetime_counts(self, *, user_id: str) -> dict[str, int]:
        return dict(self.store.get(user_id, {}))


def test_usage_service_enforces_lifetime_limit_and_reports_summary(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_usage_runtime_caches()
    monkeypatch.setenv("RATE_LIMIT_CHAT_LIFETIME", "2")
    monkeypatch.setenv("RATE_LIMIT_AI_BURST_PER_MIN", "10")

    repo = _InMemoryLifetimeUsageRepo()
    svc = UsageService(usage_repo=repo, use_l1_cache=True)  # type: ignore[arg-type]

    assert svc.consume(user_id="user_a", bucket="chatMessages") == 1
    assert svc.consume(user_id="user_a", bucket="chatMessages") == 2

    # 3rd request hits permanent lifetime Account limit (no daily/monthly reset)
    with pytest.raises(RateLimitError) as exc_info:
        svc.consume(user_id="user_a", bucket="chatMessages")
    assert "lifetime credits used" in exc_info.value.message

    # Different user still has full independent lifetime quota
    assert svc.consume(user_id="user_b", bucket="chatMessages") == 1

    # Summary reflects exact used/limit/remaining and lifetime scope
    summary = svc.get_usage_summary(user_id="user_a")
    assert summary.quota_scope == "lifetime"
    chat_cat = next(c for c in summary.categories if c.key == "chatMessages")
    assert chat_cat.used == 2
    assert chat_cat.limit == 2
    assert chat_cat.remaining == 0
    assert chat_cat.percent_used == 100
    clear_usage_runtime_caches()


def test_usage_service_enforces_per_minute_ai_burst_limit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_usage_runtime_caches()
    monkeypatch.setenv("RATE_LIMIT_CHAT_LIFETIME", "50")
    monkeypatch.setenv("RATE_LIMIT_AI_BURST_PER_MIN", "2")

    repo = _InMemoryLifetimeUsageRepo()
    svc = UsageService(usage_repo=repo, use_l1_cache=False)  # type: ignore[arg-type]

    svc.consume(user_id="burst_user", bucket="chatMessages")
    svc.consume(user_id="burst_user", bucket="dailyPlans")

    with pytest.raises(RateLimitError) as exc_info:
        svc.consume(user_id="burst_user", bucket="indoorAssessments")
    assert "one minute" in exc_info.value.message
    clear_usage_runtime_caches()


def test_run_callable_maps_rate_limit_error_to_resource_exhausted(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FakeAuth:
        uid = "uid_limited"
        token = {"email": "u@example.com"}

    class FakeReq:
        auth = FakeAuth()
        data = {}

    def _raise_limit(self: UsageService, *, user_id: str, bucket: str) -> int:
        raise RateLimitError(f"Account limit reached for {bucket} (lifetime credits used).")

    monkeypatch.setattr("app.services.usage_service.UsageService.consume", _raise_limit)

    with pytest.raises(https_fn.HttpsError) as exc_info:
        run_callable(
            "send_chat_message",
            FakeReq(),  # type: ignore[arg-type]
            lambda _req: {"ok": True},
            require_auth=True,
            rate_limit_bucket="chatMessages",
        )
    assert exc_info.value.code == https_fn.FunctionsErrorCode.RESOURCE_EXHAUSTED
    assert "lifetime credits used" in exc_info.value.message

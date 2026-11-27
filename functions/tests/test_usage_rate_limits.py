"""Unit tests for per-user daily & burst rate limiting and Settings Usage summary."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from firebase_functions import https_fn

from app.services.usage_service import UsageService, clear_usage_runtime_caches
from app.utils.callable_utils import run_callable
from app.utils.errors import RateLimitError


class _InMemoryUsageRepo:
    def __init__(self) -> None:
        self.store: dict[tuple[str, str], dict[str, int]] = {}

    def check_and_increment(
        self,
        *,
        user_id: str,
        bucket: str,
        limit: int,
        date_str: str,
    ) -> tuple[int, bool]:
        key = (user_id, date_str)
        counts = self.store.setdefault(key, {})
        current = counts.get(bucket, 0)
        if current >= limit:
            return current, False
        counts[bucket] = current + 1
        return current + 1, True

    def get_daily_counts(self, *, user_id: str, date_str: str) -> dict[str, int]:
        return dict(self.store.get((user_id, date_str), {}))


def test_usage_service_enforces_daily_limit_and_reports_summary(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_usage_runtime_caches()
    monkeypatch.setenv("RATE_LIMIT_CHAT_DAILY", "2")
    monkeypatch.setenv("RATE_LIMIT_AI_BURST_PER_MIN", "10")

    repo = _InMemoryUsageRepo()
    svc = UsageService(usage_repo=repo, use_l1_cache=True)  # type: ignore[arg-type]
    fixed_now = datetime(2026, 11, 27, 10, 0, tzinfo=UTC)

    assert svc.consume(user_id="user_a", bucket="chatMessages", now=fixed_now) == 1
    assert svc.consume(user_id="user_a", bucket="chatMessages", now=fixed_now) == 2

    # 3rd request on same day hits RateLimitError
    with pytest.raises(RateLimitError) as exc_info:
        svc.consume(user_id="user_a", bucket="chatMessages", now=fixed_now)
    assert "Daily limit reached" in exc_info.value.message

    # Different user still has full independent quota
    assert svc.consume(user_id="user_b", bucket="chatMessages", now=fixed_now) == 1

    # Summary reflects exact used/limit/remaining and next UTC midnight reset
    summary = svc.get_usage_summary(user_id="user_a", now=fixed_now)
    assert summary.date == "2026-11-27"
    assert summary.resets_at == "2026-11-28T00:00:00Z"
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
    monkeypatch.setenv("RATE_LIMIT_CHAT_DAILY", "50")
    monkeypatch.setenv("RATE_LIMIT_AI_BURST_PER_MIN", "2")

    repo = _InMemoryUsageRepo()
    svc = UsageService(usage_repo=repo, use_l1_cache=False)  # type: ignore[arg-type]
    fixed_now = datetime(2026, 11, 27, 10, 0, tzinfo=UTC)

    svc.consume(user_id="burst_user", bucket="chatMessages", now=fixed_now)
    svc.consume(user_id="burst_user", bucket="dailyPlans", now=fixed_now)

    with pytest.raises(RateLimitError) as exc_info:
        svc.consume(user_id="burst_user", bucket="indoorAssessments", now=fixed_now)
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
        raise RateLimitError(f"Daily limit reached for {bucket}.")

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
    assert "Daily limit reached" in exc_info.value.message
